import { $ } from "zx";
import { readFile, readdir, stat } from "node:fs/promises";
import ts from "typescript";
import {
    dirname,
    extname,
    join,
    normalize,
    relative,
    resolve,
} from "node:path";

const $$ = $({ stdio: "inherit" });
void $$;

const root = resolve(import.meta.dirname, "..");
const sourceRoot = join(root, "src");
const allowedRootModules = new Set(["index.tsx", "node.ts"]);
const extensions = [".ts", ".tsx", ".js", ".jsx"];
const tsconfig = JSON.parse(
    await readFile(join(root, "tsconfig.json"), "utf8"),
);
const configuredPaths: Record<string, string[]> =
    tsconfig.compilerOptions.paths;
const paths = Object.entries(configuredPaths);

async function sourceFiles(directory: string): Promise<string[]> {
    const files: string[] = [];
    for (const entry of await readdir(directory)) {
        const path = join(directory, entry);
        if ((await stat(path)).isDirectory())
            files.push(...(await sourceFiles(path)));
        else if (extensions.includes(extname(path))) files.push(path);
    }
    return files;
}

async function existingModule(path: string): Promise<string | undefined> {
    for (const candidate of [
        path,
        ...extensions.map((extension) => `${path}${extension}`),
        ...extensions.map((extension) => join(path, `index${extension}`)),
    ]) {
        try {
            if ((await stat(candidate)).isFile()) return normalize(candidate);
        } catch {
            /* try the next extension */
        }
    }
}

async function resolveImport(
    from: string,
    specifier: string,
): Promise<string | undefined> {
    if (specifier.startsWith("."))
        return existingModule(resolve(dirname(from), specifier));
    for (const [pattern, targets] of paths) {
        const star = pattern.indexOf("*");
        const matches =
            star < 0
                ? specifier === pattern
                : specifier.startsWith(pattern.slice(0, star)) &&
                  specifier.endsWith(pattern.slice(star + 1));
        if (!matches) continue;
        const value =
            star < 0
                ? ""
                : specifier.slice(
                      star,
                      specifier.length - (pattern.length - star - 1),
                  );
        for (const target of targets) {
            const resolved = await existingModule(
                resolve(root, target.replace("*", value)),
            );
            if (resolved) return resolved;
        }
    }
}

function imports(source: string, file: string): string[] {
    const results: string[] = [];
    const sourceFile = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    function addModuleSpecifier(node: ts.Node): void {
        if (
            (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
            node.moduleSpecifier
        ) {
            if (!ts.isStringLiteral(node.moduleSpecifier)) {
                throw new Error(
                    `Non-literal module specifier in ${relative(root, file)}`,
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
                throw new Error(
                    `Non-literal dynamic import in ${relative(root, file)}`,
                );
            }
            results.push(argument.text);
        }

        ts.forEachChild(node, addModuleSpecifier);
    }

    addModuleSpecifier(sourceFile);
    return results;
}

function ownership(file: string): "core" | "app" | "root" | "outside" {
    const path = relative(sourceRoot, file);
    if (path.startsWith(`core/`)) return "core";
    if (path.startsWith(`app/`)) return "app";
    if (allowedRootModules.has(path)) return "root";
    return file.startsWith(sourceRoot) ? "outside" : "root";
}

const files = await sourceFiles(sourceRoot);
const graph = new Map<string, string[]>();
for (const file of files) {
    const dependencies: string[] = [];
    for (const specifier of imports(await readFile(file, "utf8"), file)) {
        const dependency = await resolveImport(file, specifier);
        if (dependency) dependencies.push(dependency);
    }
    graph.set(file, dependencies);
}

for (const start of files.filter((file) => ownership(file) === "core")) {
    const pending = [start];
    const visited = new Set<string>();
    while (pending.length) {
        const file = pending.pop();
        if (!file || visited.has(file)) continue;
        visited.add(file);
        for (const dependency of graph.get(file) ?? []) {
            const owner = ownership(dependency);
            if (owner === "app" || owner === "outside")
                throw new Error(
                    `Core boundary violation: ${relative(root, start)} reaches ${relative(root, dependency)}`,
                );
            if (owner === "core") pending.push(dependency);
        }
    }
}

console.log(
    `Core boundary valid (${files.filter((file) => ownership(file) === "core").length} modules)`,
);
