import { useAppContext } from "@/app/app";

type ClientFunction = ((...args: any[]) => any) & { displayName?: string };
const nameCache = new WeakMap<ClientFunction, string>();

function getGlobalName(fn: ClientFunction): string {
    const cachedName = nameCache.get(fn);
    if (cachedName) return cachedName;
    let hash = 5381;
    const input = fn.toString();
    for (let i = 0; i < input.length; i++)
        hash = ((hash << 5) + hash + input.charCodeAt(i)) & hash;
    const name = fn.displayName || fn.name;
    const globalName = name
        ? `__${name}_${Math.abs(hash).toString(16)}`
        : `__${Math.abs(hash).toString(16)}`;
    nameCache.set(fn, globalName);
    return globalName;
}

function localizeDependencyReferences(
    source: string,
    dependencies: ClientFunction[],
): string {
    for (const dependency of dependencies) {
        // Vite leaves imported functions as module references in Function#toString,
        // either `(0, module.fn)` for calls or `module.fn` for tagged templates.
        // Emitted browser scripts do not have those server-side module objects, so
        // replace both forms with the local dependency binding added by Script.
        const escapedName = dependency.name.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
        );
        source = source.replace(
            new RegExp(
                `(?:\\(0,[\\w$]+\\.${escapedName}\\)|[\\w$]+\\.${escapedName})`,
                "g",
            ),
            dependency.name,
        );
    }
    return source;
}

export function Script<T extends readonly unknown[] = []>(props: {
    $exec: ((...args: T) => void) & { displayName?: string };
    $deps?: ClientFunction[];
    $args?: T;
}) {
    const jsDupCache = useAppContext().jsDupCache;
    let depsCode = "";
    for (const dep of props.$deps ?? []) {
        if (!dep.name)
            throw new Error(
                "All client dependencies must have a function name: " +
                    dep.toString(),
            );
        if (!jsDupCache.has(dep)) {
            jsDupCache.add(dep);
            const depSource = localizeDependencyReferences(
                dep.toString(),
                props.$deps ?? [],
            );
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
            depsCode += `const ${dep.name} = ${globalName};\n`;
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
