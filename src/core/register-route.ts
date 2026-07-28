import type { Handler } from "hono";
import type { AppRouter, Env } from "@/core/create-app";

/** Route pattern and access metadata consumed during registration. */
export type RegisteredRoute<Path extends string = string> = {
    readonly route: Path;
    readonly metadata: {
        readonly public: boolean;
        readonly privacyPolicyExempt: boolean;
    };
};

/** HTTP methods supported by typed application routes. */
export type RegisteredMethod = "get" | "post" | "put" | "delete" | "patch";

/**
 * Checks whether an unknown runtime value contains a valid route path and
 * boolean access metadata.
 *
 * This guard validates only the fields needed by route registration; extra
 * properties are permitted.
 *
 * @param value - Value to inspect.
 * @returns Whether `value` can be treated as a {@link RegisteredRoute}.
 */
export function isRegisteredRoute(value: unknown): value is RegisteredRoute {
    if (
        value === null ||
        (typeof value !== "object" && typeof value !== "function")
    ) {
        return false;
    }
    const metadata = Reflect.get(value, "metadata");
    return (
        typeof Reflect.get(value, "route") === "string" &&
        typeof metadata === "object" &&
        metadata !== null &&
        typeof Reflect.get(metadata, "public") === "boolean" &&
        typeof Reflect.get(metadata, "privacyPolicyExempt") === "boolean"
    );
}

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

/**
 * Gets the access-matcher map associated with an application, creating it on
 * first use. The weak association allows application instances and their
 * registration metadata to be garbage-collected together.
 *
 * @param app - Application whose registered route matchers are needed.
 * @returns The mutable matcher map owned by `app`.
 */
function matcherMap(app: RouteApp): Map<string, RegisteredMatcher> {
    let matchers = registeredMatchers.get(app);
    if (!matchers) {
        matchers = new Map();
        registeredMatchers.set(app, matchers);
    }
    return matchers;
}

/**
 * Escapes regular-expression metacharacters so a static route segment is
 * matched literally.
 *
 * @param value - Static route text to escape.
 * @returns Text safe to interpolate into a regular-expression source.
 */
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Determines whether a path segment is a supported named route parameter.
 * Parameters begin with `:` and contain only word characters.
 *
 * @param segment - Single path segment to inspect.
 * @returns Whether the segment has the supported parameter syntax.
 */
function isParameterSegment(segment: string): boolean {
    return /^:\w+$/.test(segment);
}

/**
 * Determines whether a path segment contains only supported literal
 * characters. Static segments may contain word characters, periods, and
 * hyphens.
 *
 * @param segment - Single path segment to inspect.
 * @returns Whether the segment is a supported static segment.
 */
function isStaticSegment(segment: string): boolean {
    return /^[\w.-]+$/.test(segment);
}

/**
 * Verifies that a route can be compiled by the access-metadata matcher.
 * Supported routes are absolute paths composed of static segments and simple
 * named parameters; wildcards and custom parameter expressions are rejected.
 *
 * @param route - Route pattern to validate.
 * @throws {Error} When the route is not `/` and contains unsupported syntax.
 */
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

/**
 * Compiles a typed route into the regular expression and ordering metadata
 * used for request access checks.
 *
 * Static segments receive greater specificity than parameter segments so an
 * exact route wins when multiple registered patterns match the same path.
 *
 * @param route - Registered route and its access metadata.
 * @returns A matcher anchored to the complete request path.
 * @throws {Error} When the route uses syntax unsupported by the matcher.
 */
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

/**
 * Compares two route matchers segment by segment, preferring static segments
 * at the earliest position where their patterns differ. If all compared
 * segments are equal, the longer pattern is more specific.
 *
 * @param left - Candidate matcher being ranked.
 * @param right - Matcher against which the candidate is compared.
 * @returns A positive number when `left` is more specific, a negative number
 * when `right` is more specific, or zero when they have equal specificity.
 */
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

/**
 * Creates the canonical lookup key for a method and route-pattern pair.
 *
 * @param method - Supported lowercase registration method.
 * @param route - Registered route pattern.
 * @returns A key containing the normalized uppercase method and route.
 */
function matcherKey(method: RegisteredMethod, route: string): string {
    return `${method.toUpperCase()} ${route}`;
}

/**
 * Records access metadata for a method and route pattern. Re-registering the
 * same pair is allowed only when both access flags remain identical.
 *
 * @param app - Application receiving the route registration.
 * @param method - HTTP method associated with the route.
 * @param route - Route pattern and access metadata to record.
 * @throws {Error} When the route pattern is unsupported or an existing
 * registration has conflicting access metadata.
 */
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

/**
 * Registers a Hono handler while recording the route's access metadata for
 * authentication and privacy-policy checks.
 *
 * Registration validates the route pattern before forwarding the normalized
 * method, route, and handler to Hono.
 *
 * @param app - Application on which to register the handler.
 * @param registration - Method, typed route definition, and Hono handler.
 * @throws {Error} When the route pattern is unsupported or conflicts with
 * access metadata previously registered for the same method and route.
 */
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

/**
 * Finds the most specific access matcher registered for a request. `HEAD`
 * requests use `GET` metadata, mirroring Hono's implicit HEAD handling; ties
 * prefer a protected route over a public route.
 *
 * @param app - Application whose route metadata should be searched.
 * @param method - Request method, in any letter case.
 * @param path - Absolute request path to match.
 * @returns The best registered matcher, or `undefined` when none matches.
 */
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

/**
 * Checks whether a request resolves to a registered public route.
 * Unregistered requests and registered protected routes both return `false`.
 *
 * @param app - Application whose route metadata should be searched.
 * @param method - Request method, in any letter case.
 * @param path - Absolute request path to match.
 * @returns Whether the best matching registered route is public.
 */
export function isRegisteredPublicRoute(
    app: RouteApp,
    method: string,
    path: string,
): boolean {
    return registeredMatcher(app, method, path)?.public ?? false;
}

/**
 * Checks whether a request resolves to a route that bypasses privacy-policy
 * acceptance. Unregistered requests are not considered exempt.
 *
 * @param app - Application whose route metadata should be searched.
 * @param method - Request method, in any letter case.
 * @param path - Absolute request path to match.
 * @returns Whether the best matching route is privacy-policy exempt.
 */
export function isRegisteredPrivacyPolicyExemptRoute(
    app: RouteApp,
    method: string,
    path: string,
): boolean {
    return registeredMatcher(app, method, path)?.privacyPolicyExempt ?? false;
}
