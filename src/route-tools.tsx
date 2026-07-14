import { AppRequestContext } from "@/app";

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
