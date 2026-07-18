import { useAppContext } from "@/app/app";

type ClientFunction = ((...args: any[]) => any) & { displayName?: string };
type ClientValue =
    | null
    | boolean
    | number
    | string
    | ClientFunction
    | readonly ClientValue[]
    | { readonly [key: string]: ClientValue };
type ClientObject = { displayName?: string } & {
    readonly [key: string]: ClientValue | undefined;
};
type ClientDependency = ClientFunction | ClientObject;
const nameCache = new WeakMap<object, string>();

function getDependencyName(dependency: ClientDependency): string {
    const name =
        dependency.displayName ||
        (typeof dependency === "function" ? dependency.name : "");
    if (!name || !/^[$A-Z_a-z][$\w]*$/.test(name)) {
        throw new Error(
            "All client dependencies must have a valid name or displayName: " +
                String(dependency),
        );
    }
    return name;
}

function getGlobalName(dependency: ClientDependency): string {
    const cachedName = nameCache.get(dependency);
    if (cachedName) return cachedName;
    let hash = 5381;
    const input = serializeClientValue(dependency, [], new Set());
    for (let i = 0; i < input.length; i++)
        hash = ((hash << 5) + hash + input.charCodeAt(i)) & hash;
    const globalName = `__${getDependencyName(dependency)}_${Math.abs(hash).toString(16)}`;
    nameCache.set(dependency, globalName);
    return globalName;
}

function localizeDependencyReferences(
    source: string,
    dependencies: ClientDependency[],
): string {
    for (const dependency of dependencies) {
        // Vite leaves imported functions as module references in Function#toString,
        // either `(0, module.fn)` for calls or `module.fn` for tagged templates.
        // Emitted browser scripts do not have those server-side module objects, so
        // replace both forms with the local dependency binding added by Script.
        const dependencyName = getDependencyName(dependency);
        const escapedName = dependencyName.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
        );
        source = source.replace(
            new RegExp(
                `(?:\\(0,[\\w$]+\\.${escapedName}\\)|[\\w$]+\\.${escapedName})`,
                "g",
            ),
            dependencyName,
        );
    }
    return source;
}

function serializeClientValue(
    value: ClientValue | ClientObject,
    dependencies: ClientDependency[],
    ancestors: Set<object>,
): string {
    if (typeof value === "function") {
        return localizeDependencyReferences(value.toString(), dependencies);
    }
    if (value === null || typeof value !== "object") {
        const json = JSON.stringify(value);
        if (json === undefined)
            throw new Error(
                `Unsupported client dependency value: ${String(value)}`,
            );
        return json;
    }
    if (ancestors.has(value))
        throw new Error("Client dependencies cannot contain circular values");
    ancestors.add(value);
    let source: string;
    if (Array.isArray(value)) {
        source = `[${value
            .map((item) => serializeClientValue(item, dependencies, ancestors))
            .join(",")}]`;
    } else {
        source = `{${Object.entries(value)
            .map(([key, item]) => {
                if (item === undefined)
                    throw new Error(
                        `Unsupported client dependency value at ${key}: undefined`,
                    );
                return `${JSON.stringify(key)}:${serializeClientValue(item, dependencies, ancestors)}`;
            })
            .join(",")}}`;
    }
    ancestors.delete(value);
    return source;
}

export function serializeClientDependency(
    dependency: ClientDependency,
    dependencies: ClientDependency[] = [],
): string {
    return serializeClientValue(dependency, dependencies, new Set());
}

export function Script<T extends readonly unknown[] = []>(props: {
    $exec: ((...args: T) => void) & { displayName?: string };
    $deps?: ClientDependency[];
    $args?: T;
}) {
    const jsDupCache = useAppContext().jsDupCache;
    let depsCode = "";
    for (const dep of props.$deps ?? []) {
        if (!jsDupCache.has(dep)) {
            jsDupCache.add(dep);
            const depSource = serializeClientDependency(dep, props.$deps ?? []);
            depsCode += `${getGlobalName(dep)} = ${depSource};\n`;
        }
    }
    if (!jsDupCache.has(props.$exec)) {
        jsDupCache.add(props.$exec);
        const execSource = localizeDependencyReferences(
            props.$exec.toString(),
            props.$deps ?? [],
        );
        for (const dep of props.$deps ?? []) {
            const globalName = getGlobalName(dep);
            depsCode += `const ${getDependencyName(dep)} = ${globalName};\n`;
        }
        depsCode += `${getGlobalName(props.$exec)} = ${execSource};\n`;
    }
    if (depsCode !== "")
        depsCode = `\n(() => { const __name = (a) => a; ${depsCode} })();\n`;
    const args =
        props.$args?.map((arg) => JSON.stringify(arg)).join(", ") ?? "";
    return (
        <script
            dangerouslySetInnerHTML={{
                __html: `\n${depsCode}\n${getGlobalName(props.$exec)}(${args});\n`,
            }}
        />
    );
}
