import type { AppRequestContext } from "@/core/create-app";

type ExtractRouteParams<T extends string> =
    T extends `${string}:${infer Param}/${infer Rest}`
        ? { [K in Param]: string | number } & ExtractRouteParams<`/${Rest}`>
        : T extends `${string}:${infer Param}`
          ? { [K in Param]: string | number }
          : { __empty?: never } | undefined | null;

/**
 * Builds a path from a route pattern by substituting `:param` segments and
 * appending a query string. Throws when a required path param is missing.
 */
function createUrl<T extends string>(
    pattern: T,
    params: ExtractRouteParams<T>,
    queryParams?: Record<string, any>,
): string {
    let url = pattern.replace(/:(\w+)/g, (_, key: string) => {
        const value = Object.entries(params ?? {}).find(
            ([name]) => name === key,
        )?.[1];
        if (value === undefined)
            throw new Error(
                `Route parameter "${key}" is required but not provided. Required in route: ${pattern}`,
            );
        return encodeURIComponent(String(value));
    });
    if (queryParams) {
        const search = new URLSearchParams();
        for (const [key, value] of Object.entries(queryParams))
            if (value !== undefined && value !== null)
                search.append(key, String(value));
        const query = search.toString();
        if (query) url += `?${query}`;
    }
    return url;
}

/**
 * Defines a typed route helper for `src/core/routes.ts` and app routes.
 *
 * The returned function builds URLs: `routeFn(params, query?)`. Chain
 * `.query<Q>()`, `.public()`, or `.publicAsset()` before use. Also exposes
 * `.route` (pattern), `.params(c)`, `.query(c)` when typed, and `.metadata`.
 *
 * @param pattern - Path pattern with optional `:param` segments.
 */
export function route<T extends string>(pattern: T) {
    function plain(isPublic: boolean, privacyPolicyExempt = false) {
        function to(
            params: ExtractRouteParams<T>,
            queryParams?: Record<string, any>,
        ): string {
            return createUrl(pattern, params, queryParams);
        }
        to.route = pattern;
        to.metadata = Object.freeze({
            public: isPublic,
            privacyPolicyExempt,
        });
        to.params = (c: AppRequestContext) => c.req.param();
        to.query = function query<Q extends Record<string, any>>() {
            return queried<Q>(isPublic, privacyPolicyExempt);
        };
        to.public = () => plain(true);
        to.publicAsset = () => plain(true, true);
        return to;
    }

    function queried<Q extends Record<string, any>>(
        isPublic: boolean,
        privacyPolicyExempt: boolean,
    ) {
        function to(params: ExtractRouteParams<T>, queryParams?: Q): string {
            return createUrl(pattern, params, queryParams);
        }
        to.route = pattern;
        to.metadata = Object.freeze({
            public: isPublic,
            privacyPolicyExempt,
        });
        to.params = (c: AppRequestContext) => c.req.param();
        to.query = (c: AppRequestContext) => c.req.query();
        to.public = () => queried<Q>(true, privacyPolicyExempt);
        to.publicAsset = () => queried<Q>(true, true);
        return to;
    }

    return plain(false);
}
