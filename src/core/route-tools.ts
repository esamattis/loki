import type { AppRequestContext } from "@/core/create-app";

type ExtractRouteParams<T extends string> =
    T extends `${string}:${infer Param}/${infer Rest}`
        ? { [K in Param]: string | number } & ExtractRouteParams<`/${Rest}`>
        : T extends `${string}:${infer Param}`
          ? { [K in Param]: string | number }
          : { __empty?: never } | undefined | null;

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

export function route<T extends string>(pattern: T) {
    function plain(isPublic: boolean) {
        function to(
            params: ExtractRouteParams<T>,
            queryParams?: Record<string, any>,
        ): string {
            return createUrl(pattern, params, queryParams);
        }
        to.route = pattern;
        to.metadata = Object.freeze({ public: isPublic });
        to.params = (c: AppRequestContext) => c.req.param();
        to.query = function query<Q extends Record<string, any>>() {
            return queried<Q>(isPublic);
        };
        to.public = () => plain(true);
        return to;
    }

    function queried<Q extends Record<string, any>>(isPublic: boolean) {
        function to(params: ExtractRouteParams<T>, queryParams?: Q): string {
            return createUrl(pattern, params, queryParams);
        }
        to.route = pattern;
        to.metadata = Object.freeze({ public: isPublic });
        to.params = (c: AppRequestContext) => c.req.param();
        to.query = (c: AppRequestContext) => c.req.query();
        to.public = () => queried<Q>(true);
        return to;
    }

    return plain(false);
}
