import type { Handler } from "hono";
import type { App, Env } from "@/core/create-app";

type RegisteredRoute = {
    readonly route: string;
    readonly metadata: { readonly public: boolean };
};

type RouteApp = Pick<App, "on">;

type RegisteredMatcher = {
    readonly expression: RegExp;
    readonly public: boolean;
    readonly specificity: readonly number[];
};

const registeredMatchers = new WeakMap<
    RouteApp,
    Map<string, RegisteredMatcher>
>();

function matcherMap(app: RouteApp): Map<string, RegisteredMatcher> {
    let matchers = registeredMatchers.get(app);
    if (!matchers) {
        matchers = new Map();
        registeredMatchers.set(app, matchers);
    }
    return matchers;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isParameterSegment(segment: string): boolean {
    return /^:\w+$/.test(segment);
}

function compileMatcher(route: RegisteredRoute): RegisteredMatcher {
    const segments = route.route.split("/");
    const expression = segments
        .map((segment) =>
            isParameterSegment(segment) ? "[^/]+" : escapeRegExp(segment),
        )
        .join("/");
    return {
        expression: new RegExp(`^${expression}$`),
        public: route.metadata.public,
        specificity: segments.map((segment) =>
            isParameterSegment(segment) ? 0 : 1,
        ),
    };
}

function compareSpecificity(
    left: RegisteredMatcher,
    right: RegisteredMatcher,
): number {
    for (
        let index = 0;
        index < Math.max(left.specificity.length, right.specificity.length);
        index++
    ) {
        const difference =
            (left.specificity[index] ?? -1) - (right.specificity[index] ?? -1);
        if (difference !== 0) return difference;
    }
    return 0;
}

function registerAccess(app: RouteApp, route: RegisteredRoute): void {
    const matchers = matcherMap(app);
    const registered = matchers.get(route.route);
    if (registered) {
        if (registered.public !== route.metadata.public) {
            throw new Error(
                `Route "${route.route}" cannot be both public and protected`,
            );
        }
        return;
    }
    matchers.set(route.route, compileMatcher(route));
}

export function registerRoute(
    app: RouteApp,
    ...registration: readonly [
        method: "get" | "post" | "put" | "delete" | "patch",
        route: RegisteredRoute,
        handler: Handler<Env>,
    ]
): void {
    const [method, route, handler] = registration;
    registerAccess(app, route);
    app.on(method.toUpperCase(), route.route, handler);
}

export function isRegisteredPublicPath(app: RouteApp, path: string): boolean {
    let bestMatch: RegisteredMatcher | undefined;
    for (const matcher of matcherMap(app).values()) {
        const specificity = bestMatch
            ? compareSpecificity(matcher, bestMatch)
            : 1;
        if (
            matcher.expression.test(path) &&
            (specificity > 0 ||
                (specificity === 0 && bestMatch?.public && !matcher.public))
        ) {
            bestMatch = matcher;
        }
    }
    return bestMatch?.public ?? false;
}
