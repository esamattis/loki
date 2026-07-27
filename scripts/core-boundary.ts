import { readFile, readdir, stat } from "node:fs/promises";
import {
    dirname,
    extname,
    isAbsolute,
    join,
    normalize,
    relative,
    resolve,
} from "node:path";
import ts from "typescript";

type Owner = "core" | "app" | "root" | "outside";

const sourceExtensions = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mts",
    ".cts",
    ".mjs",
    ".cjs",
    ".css",
    ".json",
    ".html",
    ".svg",
    ".txt",
]);
const assetExtensions = [".css", ".json", ".html", ".svg", ".txt"];
const rootModules = new Set(["index.tsx", "node.ts"]);

export type CoreBoundaryResult = {
    coreModuleCount: number;
};

type Project = {
    root: string;
    sourceRoot: string;
    compilerOptions: ts.CompilerOptions;
    pathAliases: Record<string, string[]>;
};

function isWithin(parent: string, file: string): boolean {
    const path = relative(parent, file);
    return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

function ownership(project: Project, file: string): Owner {
    const path = relative(project.sourceRoot, file);
    if (isWithin(join(project.sourceRoot, "core"), file)) return "core";
    if (isWithin(join(project.sourceRoot, "app"), file)) return "app";
    if (rootModules.has(path)) return "root";
    return "outside";
}

async function moduleFiles(directory: string): Promise<string[]> {
    const files: string[] = [];
    for (const entry of await readdir(directory)) {
        const path = join(directory, entry);
        if ((await stat(path)).isDirectory())
            files.push(...(await moduleFiles(path)));
        else if (sourceExtensions.has(extname(path)))
            files.push(normalize(path));
    }
    return files;
}

function loadProject(root: string): Project {
    const configPath = ts.findConfigFile(root, ts.sys.fileExists);
    if (!configPath) throw new Error(`Missing tsconfig.json in ${root}`);
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    if (config.error) {
        throw new Error(
            ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
        );
    }
    const parsed = ts.parseJsonConfigFileContent(
        config.config,
        ts.sys,
        dirname(configPath),
    );
    if (parsed.errors.length > 0) {
        throw new Error(
            ts.formatDiagnostics(parsed.errors, {
                getCanonicalFileName: String,
                getCurrentDirectory: () => root,
                getNewLine: () => "\n",
            }),
        );
    }
    return {
        root,
        sourceRoot: join(root, "src"),
        compilerOptions: parsed.options,
        pathAliases: parsed.options.paths ?? {},
    };
}

function withoutQuery(specifier: string): string {
    return specifier.split(/[?#]/, 1)[0] ?? specifier;
}

function matchesAlias(specifier: string, pattern: string): boolean {
    const star = pattern.indexOf("*");
    if (star < 0) return specifier === pattern;
    return (
        specifier.startsWith(pattern.slice(0, star)) &&
        specifier.endsWith(pattern.slice(star + 1))
    );
}

function isInternalSpecifier(project: Project, specifier: string): boolean {
    return (
        specifier.startsWith(".") ||
        isAbsolute(specifier) ||
        Object.keys(project.pathAliases).some((pattern) =>
            matchesAlias(specifier, pattern),
        )
    );
}

function replaceAliasStar(
    pattern: string,
    target: string,
    specifier: string,
): string {
    const star = pattern.indexOf("*");
    if (star < 0) return target;
    const value = specifier.slice(
        star,
        specifier.length - (pattern.length - star - 1),
    );
    return target.replace("*", value);
}

function assetPaths(
    project: Project,
    from: string,
    specifier: string,
): string[] {
    if (specifier.startsWith(".")) return [resolve(dirname(from), specifier)];
    if (isAbsolute(specifier)) return [specifier];
    const paths: string[] = [];
    for (const [pattern, targets] of Object.entries(project.pathAliases)) {
        if (!matchesAlias(specifier, pattern)) continue;
        for (const target of targets) {
            paths.push(
                resolve(
                    project.compilerOptions.baseUrl ?? project.root,
                    replaceAliasStar(pattern, target, specifier),
                ),
            );
        }
    }
    return paths;
}

function resolveAsset(
    project: Project,
    from: string,
    specifier: string,
): string | undefined {
    const paths = assetPaths(project, from, specifier);
    const candidates = [
        ...paths,
        ...paths.flatMap((path) =>
            assetExtensions.map((extension) => `${path}${extension}`),
        ),
        ...paths.flatMap((path) =>
            assetExtensions.map((extension) => join(path, `index${extension}`)),
        ),
    ];
    return candidates.find((candidate) => ts.sys.fileExists(candidate));
}

function resolveImport(
    project: Project,
    from: string,
    originalSpecifier: string,
): string | undefined {
    const specifier = withoutQuery(originalSpecifier);
    if (!isInternalSpecifier(project, specifier)) return undefined;
    const resolved = ts.resolveModuleName(
        specifier,
        from,
        project.compilerOptions,
        ts.sys,
    ).resolvedModule?.resolvedFileName;
    const dependency = resolved ?? resolveAsset(project, from, specifier);
    if (!dependency) {
        throw new Error(
            `Unresolved internal import "${originalSpecifier}" in ${relative(project.root, from)}`,
        );
    }
    return normalize(dependency);
}

function cssImports(source: string): string[] {
    return Array.from(
        source.matchAll(
            /@import\s+(?:url\(\s*(?:["']([^"']+)["']|([^'")\s]+))\s*\)|["']([^"']+)["'])/g,
        ),
    ).flatMap((match) => {
        const specifier = match[1] ?? match[2] ?? match[3];
        return specifier ? [specifier] : [];
    });
}

function scriptImports(
    project: Project,
    source: string,
    file: string,
): string[] {
    const results: string[] = [];
    const sourceFile = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    function visit(node: ts.Node): void {
        if (
            ts.isImportEqualsDeclaration(node) &&
            ts.isExternalModuleReference(node.moduleReference)
        ) {
            const expression = node.moduleReference.expression;
            if (!expression || !ts.isStringLiteral(expression)) {
                throw new Error(
                    `Non-literal module specifier in ${relative(project.root, file)}`,
                );
            }
            results.push(expression.text);
        }
        if (
            (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
            node.moduleSpecifier
        ) {
            if (!ts.isStringLiteral(node.moduleSpecifier)) {
                throw new Error(
                    `Non-literal module specifier in ${relative(project.root, file)}`,
                );
            }
            results.push(node.moduleSpecifier.text);
        }
        if (
            ts.isCallExpression(node) &&
            node.expression.kind === ts.SyntaxKind.ImportKeyword
        ) {
            const argument = node.arguments[0];
            if (!argument || !ts.isStringLiteral(argument)) {
                if (ownership(project, file) === "core") {
                    throw new Error(
                        `Non-literal dynamic import in ${relative(project.root, file)}`,
                    );
                }
            } else {
                results.push(argument.text);
            }
        }
        if (
            ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            node.expression.text === "require"
        ) {
            const argument = node.arguments[0];
            if (!argument || !ts.isStringLiteral(argument)) {
                if (ownership(project, file) === "core") {
                    throw new Error(
                        `Non-literal require in ${relative(project.root, file)}`,
                    );
                }
            } else {
                results.push(argument.text);
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    return results;
}

async function imports(project: Project, file: string): Promise<string[]> {
    const source = await readFile(file, "utf8");
    if (extname(file) === ".css") return cssImports(source);
    if (
        ![
            ".ts",
            ".tsx",
            ".js",
            ".jsx",
            ".mts",
            ".cts",
            ".mjs",
            ".cjs",
        ].includes(extname(file))
    )
        return [];
    return scriptImports(project, source, file);
}

export async function checkCoreBoundary(
    projectRoot: string,
): Promise<CoreBoundaryResult> {
    const project = loadProject(resolve(projectRoot));
    const coreFiles = await moduleFiles(join(project.sourceRoot, "core"));
    for (const file of coreFiles) {
        for (const specifier of await imports(project, file)) {
            const dependency = resolveImport(project, file, specifier);
            if (!dependency) continue;
            const owner = ownership(project, dependency);
            if (owner !== "core") {
                throw new Error(
                    `Core boundary violation: ${relative(project.root, file)} imports ${relative(project.root, dependency)} (${owner})`,
                );
            }
        }
    }
    return { coreModuleCount: coreFiles.length };
}
