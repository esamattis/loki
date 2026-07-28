import type { Handler } from "hono";
import type { AppRouter, Env } from "@/core/create-app";

type RegisteredRoute = {
    readonly route: string;
    readonly metadata: {
        readonly public: boolean;
        readonly privacyPolicyExempt: boolean;
    };
};

type RegisteredMethod = "get" | "post" | "put" | "delete" | "patch";

type RouteApp = Pick<AppRouter, "on">;

type RegisteredMatcher = {
    readonly expression: RegExp;
    readonly public: boolean;
    readonly privacyPolicyExempt: boolean;
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

function isStaticSegment(segment: string): boolean {
    return /^[\w.-]+$/.test(segment);
}

function validateRoute(route: string): void {
    if (route === "/") return;
    const segments = route.split("/");
    if (
        !route.startsWith("/") ||
        segments.some(
            (segment, index) =>
                index > 0 &&
                !isParameterSegment(segment) &&
                !isStaticSegment(segment),
        )
    ) {
        throw new Error(
            `Unsupported route pattern "${route}". Routes must use static path segments or named parameters such as ":id".`,
        );
    }
}

function compileMatcher(route: RegisteredRoute): RegisteredMatcher {
    validateRoute(route.route);
    const segments = route.route.split("/");
    const expression = segments
        .map((segment) =>
            isParameterSegment(segment) ? "[^/]+" : escapeRegExp(segment),
        )
        .join("/");
    return {
        expression: new RegExp(`^${expression}$`),
        public: route.metadata.public,
        privacyPolicyExempt: route.metadata.privacyPolicyExempt,
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

function matcherKey(method: RegisteredMethod, route: string): string {
    return `${method.toUpperCase()} ${route}`;
}

function registerAccess(
    app: RouteApp,
    method: RegisteredMethod,
    route: RegisteredRoute,
): void {
    const matchers = matcherMap(app);
    const key = matcherKey(method, route.route);
    const registered = matchers.get(key);
    if (registered) {
        if (registered.public !== route.metadata.public) {
            throw new Error(
                `${method.toUpperCase()} route "${route.route}" cannot be both public and protected`,
            );
        }
        if (
            registered.privacyPolicyExempt !==
            route.metadata.privacyPolicyExempt
        ) {
            throw new Error(
                `${method.toUpperCase()} route "${route.route}" cannot have conflicting privacy policy access`,
            );
        }
        return;
    }
    matchers.set(key, compileMatcher(route));
}

export function registerRoute(
    app: RouteApp,
    ...registration: readonly [
        method: RegisteredMethod,
        route: RegisteredRoute,
        handler: Handler<Env>,
    ]
): void {
    const [method, route, handler] = registration;
    registerAccess(app, method, route);
    app.on(method.toUpperCase(), route.route, handler);
}

function registeredMatcher(
    app: RouteApp,
    method: string,
    path: string,
): RegisteredMatcher | undefined {
    const requestMethod = method.toUpperCase();
    const registeredMethod = requestMethod === "HEAD" ? "GET" : requestMethod;
    let bestMatch: RegisteredMatcher | undefined;
    for (const [key, matcher] of matcherMap(app)) {
        if (!key.startsWith(`${registeredMethod} `)) continue;
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
    return bestMatch;
}

export function isRegisteredPublicRoute(
    app: RouteApp,
    method: string,
    path: string,
): boolean {
    return registeredMatcher(app, method, path)?.public ?? false;
}

export function isRegisteredPrivacyPolicyExemptRoute(
    app: RouteApp,
    method: string,
    path: string,
): boolean {
    return registeredMatcher(app, method, path)?.privacyPolicyExempt ?? false;
}
