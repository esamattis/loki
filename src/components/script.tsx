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
            depsCode += `${getGlobalName(dep)} = ${dep.toString()};\n`;
        }
    }
    if (!jsDupCache.has(props.$exec)) {
        jsDupCache.add(props.$exec);
        let execSource = props.$exec.toString();
        for (const dep of props.$deps ?? []) {
            const globalName = getGlobalName(dep);
            const escapedDepName = dep.name.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&",
            );
            depsCode += `const ${dep.name} = ${globalName};\n`;
            execSource = execSource.replace(
                new RegExp(`\\(0,[\\w$]+\\.${escapedDepName}\\)`, "g"),
                dep.name,
            );
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
