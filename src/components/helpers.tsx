import { AppRequestContext, useAppContext } from "../app";
import { $assertElement } from "../utils";

function djb2Checksum(input: string): number {
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
        hash = (hash << 5) + hash + input.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

type ClientFunction = ((...args: any[]) => any) & { displayName?: string };

const nameCache = new WeakMap<ClientFunction, string>();

function getGlobalName(fn: ClientFunction): string {
    const cachedName = nameCache.get(fn);
    if (cachedName) {
        return cachedName;
    }

    const fnName = fn.displayName || fn.name;
    const checksum = djb2Checksum(fn.toString()).toString(16);
    const name = fnName ? `__${fnName}_${checksum}` : `__${checksum}`;
    nameCache.set(fn, name);
    return name;
}

export function Script<T extends readonly unknown[] = []>(props: {
    $exec: ((...args: T) => void) & { displayName?: string };
    $deps?: ClientFunction[];
    $args?: T;
}) {
    const jsDupCache = useAppContext().jsDupCache;

    let depsCode = "";

    for (const dep of props.$deps ?? []) {
        if (!dep.name) {
            throw new Error(
                "All client dependencies must have a function name: " +
                    dep.toString(),
            );
        }
        if (!jsDupCache.has(dep)) {
            jsDupCache.add(dep);
            depsCode += `${getGlobalName(dep)} = ${dep.toString()};\n`;
        }
    }

    // The $exec function is also kinda a dependency, as it needs to added only
    // once on the page even if it is used multiple times.
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

    if (depsCode !== "") {
        depsCode = `
            (()=> {
                const __name = (a) => a;
                ${depsCode}
            })();
        `;
    }

    const args = props.$args?.map((a) => JSON.stringify(a)).join(", ") ?? "";
    const execCode = `${getGlobalName(props.$exec)}(${args});`;

    return (
        <script
            dangerouslySetInnerHTML={{ __html: `\n${depsCode}\n${execCode}\n` }}
        />
    );
}

export function css(
    strings: TemplateStringsArray,
    ...values: unknown[]
): string {
    return strings.reduce((result, string, i) => {
        return result + string + (values[i] ?? "");
    }, "");
}

export function Style(props: {
    children: ((css_: typeof css) => string) | string;
}) {
    const cssDubCache = useAppContext().cssDupCache;

    const cssString =
        typeof props.children === "string"
            ? props.children
            : props.children(css);

    if (cssDubCache.has(cssString)) {
        // Skip css if already rendered at least once on this page
        return <></>;
    }

    cssDubCache.add(cssString);

    return (
        <style
            dangerouslySetInnerHTML={{
                __html: cssString,
            }}
        />
    );
}

export function $initTooltips() {
    const tooltip = document.createElement("div");
    tooltip.id = "tooltip";
    tooltip.role = "tooltip";
    tooltip.hidden = true;
    tooltip.className =
        "pointer-events-none fixed z-50 max-w-xs rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg dark:bg-slate-100 dark:text-slate-900";
    const tooltipText = document.createElement("span");
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.className =
        "absolute left-1/2 top-full -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-slate-900 dark:border-t-slate-100";
    tooltip.appendChild(tooltipText);
    tooltip.appendChild(arrow);
    document.body.appendChild(tooltip);

    let activeTarget: HTMLElement | null = null;

    function getTooltipTarget(target: EventTarget | null): HTMLElement | null {
        if (!(target instanceof Element)) {
            return null;
        }
        const tooltipTarget = target.closest("[data-tooltip]");
        if (!tooltipTarget) {
            return null;
        }
        $assertElement(tooltipTarget, HTMLElement);
        return tooltipTarget.dataset.tooltip ? tooltipTarget : null;
    }

    function showTooltip(target: HTMLElement) {
        activeTarget = target;
        tooltipText.textContent = target.dataset.tooltip!;
        tooltip.hidden = false;

        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const left = Math.max(
            8,
            Math.min(
                targetRect.left + (targetRect.width - tooltipRect.width) / 2,
                window.innerWidth - tooltipRect.width - 8,
            ),
        );
        const top = Math.max(8, targetRect.top - tooltipRect.height - 8);
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }

    function hideTooltip(target?: HTMLElement | null) {
        if (target && target !== activeTarget) {
            return;
        }
        activeTarget = null;
        tooltip.hidden = true;
    }

    document.addEventListener(
        "pointerover",
        (event) => {
            const target = getTooltipTarget(event.target);
            if (target) {
                showTooltip(target);
            }
        },
        { passive: true },
    );
    document.addEventListener(
        "pointerout",
        (event) => {
            const target = getTooltipTarget(event.target);
            const relatedTarget = event.relatedTarget;
            if (
                target &&
                relatedTarget instanceof Node &&
                target.contains(relatedTarget)
            ) {
                return;
            }
            hideTooltip(target);
        },
        { passive: true },
    );
    document.addEventListener(
        "focusin",
        (event) => {
            const target = getTooltipTarget(event.target);
            if (target) {
                showTooltip(target);
            }
        },
        { passive: true },
    );
    document.addEventListener(
        "focusout",
        (event) => {
            hideTooltip(getTooltipTarget(event.target));
        },
        { passive: true },
    );
    window.addEventListener("scroll", () => hideTooltip(), {
        capture: true,
        passive: true,
    });
}

Style.css = css;

export function _routeTypeTests() {
    const home = route("/");
    // @ts-expect-error TODO: Fix this
    home();

    // @ts-expect-error No route parameters
    home({ sdf: "asd" });
    const userProfile = route("/user/:username");

    userProfile({ username: "testuser" });
    userProfile({ username: 3 });
    // @ts-expect-error Invalid route parameter type
    userProfile({ username: {} });

    const search = route("/search").query<{ q: string }>();

    search({}, { q: "testuser" });

    // @ts-expect-error Invalid query parameter type
    search({}, { q: {} });

    // @ts-expect-error missing args
    search();
    // @ts-expect-error missing args
    search({});
    // @ts-expect-error missing args
    search({}, {});
}

type ExtractRouteParams<T extends string> =
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    T extends `${infer _Start}:${infer Param}/${infer Rest}`
        ? { [K in Param]: string } & ExtractRouteParams<`/${Rest}`>
        : // eslint-disable-next-line @typescript-eslint/no-unused-vars
          T extends `${infer _Start}:${infer Param}`
          ? { [K in Param]: string | number }
          : { __empty?: never } | undefined | null;

export function route<T extends string>(route: T) {
    function to(params: ExtractRouteParams<T>): string;
    function to<Q extends Record<string, any>>(
        params: ExtractRouteParams<T>,
        queryParams: Q,
    ): string;
    function to<Q extends Record<string, any>>(
        params: ExtractRouteParams<T>,
        queryParams?: Q,
    ): string {
        let url = route.replace(/:(\w+)/g, (_, key) => {
            const value = Object.entries(params ?? {}).find(
                ([paramName]) => paramName === key,
            )?.[1];
            if (value === undefined) {
                throw new Error(
                    `Route parameter "${key}" is required but not provided. Required in route: ${route}`,
                );
            }
            return encodeURIComponent(String(value));
        });

        if (queryParams) {
            const searchParams = new URLSearchParams();
            Object.entries(queryParams).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.append(key, String(value));
                }
            });
            const queryString = searchParams.toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        }

        return url;
    }

    function query<Q extends Record<string, any>>() {
        const queryWrapped = (
            params: ExtractRouteParams<T>,
            queryParams: Q,
        ): string => {
            return to(params, queryParams);
        };

        queryWrapped.route = route;
        queryWrapped.params = (c: AppRequestContext) => c.req.param();

        // get query params
        queryWrapped.query = (c: AppRequestContext) => c.req.query();

        return queryWrapped;
    }

    to.route = route;
    to.params = (c: AppRequestContext) => c.req.param();

    to.query = query;

    return to;
}
