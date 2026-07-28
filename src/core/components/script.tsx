import { useRequestContext } from "@/core/create-app";

/** Describes client function. */
type ClientFunction = ((...args: any[]) => any) & { displayName?: string };
/** Describes client class. */
type ClientClass = (abstract new (...args: any[]) => unknown) & {
    displayName?: string;
};
/** Describes client code. */
type ClientCode = ClientFunction | ClientClass;
/** Describes client value. */
type ClientValue =
    | null
    | boolean
    | number
    | string
    | ClientCode
    | readonly ClientValue[]
    | { readonly [key: string]: ClientValue };
/** Describes client object. */
type ClientObject = { displayName?: string } & {
    readonly [key: string]: ClientValue | undefined;
};
/** Describes client dependency. */
type ClientDependency = ClientCode | ClientObject;
/** Stores the name cache used by this module. */
const nameCache = new WeakMap<object, string>();

/** Returns dependency name. */
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

/** Returns global name. */
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

/** Rewrites serialized dependency references to local argument names. */
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

/** Serializes a supported value for embedding in browser JavaScript. */
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

/**
 * Serializes a browser-side dependency (function, class, or plain object) to
 * source text that can run in an inline `<script>`. Nested function values are
 * stringified with `Function#toString`; module-qualified references are rewritten
 * against `dependencies` so Vite's `(0, module.fn)` form works in the browser.
 */
export function serializeClientDependency(
    dependency: ClientDependency,
    dependencies: ClientDependency[] = [],
): string {
    return serializeClientValue(dependency, dependencies, new Set());
}

/**
 * Emits an inline browser script that runs `$exec` with optional `$args` after
 * defining any `$deps`. Dependencies and the exec function are deduplicated per
 * request via `jsDupCache` and exposed as stable globals. All `$deps` and `$exec`
 * must have a valid `name` or `displayName` so they can be bound in the browser.
 *
 * @param props.$exec - Browser function to invoke (must be serializable).
 * @param props.$deps - Client functions/objects `$exec` closes over; pass whole
 *   objects (e.g. `$select`), never individual methods.
 * @param props.$args - JSON-serializable arguments passed to `$exec`.
 */
export function Script<T extends readonly unknown[] = []>(props: {
    $exec: ((...args: T) => void) & { displayName?: string };
    $deps?: ClientDependency[];
    $args?: T;
}) {
    const jsDupCache = useRequestContext().jsDupCache;
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
