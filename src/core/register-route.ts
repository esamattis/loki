import type { Handler } from "hono";
import { matchedRoutes } from "hono/route";
import type { AppRouter, Env, HonoRequestContext } from "@/core/create-app";

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

/** Describes route app. */
type RouteApp = Pick<AppRouter, "on">;

/** Describes registered route metadata. */
type RegisteredRouteMetadata = RegisteredRoute["metadata"];

/** Stores the registered metadata used by this module. */
const registeredMetadata = new WeakMap<
    RouteApp,
    Map<string, RegisteredRouteMetadata>
>();

/**
 * Gets the access-metadata map associated with an application, creating it on
 * first use. The weak association allows application instances and their
 * registration metadata to be garbage-collected together.
 *
 * @param app - Application whose registered route metadata is needed.
 * @returns The mutable metadata map owned by `app`.
 */
function metadataMap(app: RouteApp): Map<string, RegisteredRouteMetadata> {
    let metadata = registeredMetadata.get(app);
    if (!metadata) {
        metadata = new Map();
        registeredMetadata.set(app, metadata);
    }
    return metadata;
}

/**
 * Creates the canonical lookup key for a method and route-pattern pair.
 *
 * @param method - HTTP method in any letter case.
 * @param route - Registered Hono route pattern.
 * @returns A key containing the normalized uppercase method and route.
 */
function metadataKey(method: string, route: string): string {
    return `${method.toUpperCase()} ${route}`;
}

/**
 * Records access metadata for a method and route pattern. Re-registering the
 * same pair is allowed only when both access flags remain identical.
 *
 * @param app - Application receiving the route registration.
 * @param method - HTTP method associated with the route.
 * @param route - Route pattern and access metadata to record.
 * @throws {Error} When an existing registration has conflicting access
 * metadata.
 */
function registerAccess(
    app: RouteApp,
    method: RegisteredMethod,
    route: RegisteredRoute,
): void {
    const metadata = metadataMap(app);
    const key = metadataKey(method, route.route);
    const registered = metadata.get(key);
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
    metadata.set(key, route.metadata);
}

/**
 * Registers a Hono handler while recording the route's access metadata for
 * authentication and privacy-policy checks.
 *
 * @param app - Application on which to register the handler.
 * @param registration - Method, typed route definition, and Hono handler.
 * @throws {Error} When the route conflicts with access metadata previously
 * registered for the same method and route.
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
 * Gets access metadata for the first method-specific route in Hono's matched
 * execution order. Global and route-specific `ALL` middleware are skipped.
 * Native Hono routes have no registered metadata and therefore remain
 * protected by default.
 *
 * @param app - Application whose route metadata should be searched.
 * @param context - Current Hono request context containing the router's
 * already-computed match result.
 * @returns Metadata for the first matched endpoint, or `undefined` when that
 * endpoint was not registered as a typed route.
 */
function matchedRouteMetadata(
    app: RouteApp,
    context: HonoRequestContext,
): RegisteredRouteMetadata | undefined {
    for (const route of matchedRoutes(context)) {
        if (route.method === "ALL") continue;
        return metadataMap(app).get(metadataKey(route.method, route.path));
    }
}

/**
 * Checks whether Hono's first matched endpoint is a registered public route.
 * Unregistered requests and registered protected routes both return `false`.
 *
 * @param app - Application whose route metadata should be searched.
 * @param context - Current Hono request context.
 * @returns Whether the first matched endpoint is public.
 */
export function isRegisteredPublicRoute(
    app: RouteApp,
    context: HonoRequestContext,
): boolean {
    return matchedRouteMetadata(app, context)?.public ?? false;
}

/**
 * Checks whether Hono's first matched endpoint bypasses privacy-policy
 * acceptance. Unregistered requests are not considered exempt.
 *
 * @param app - Application whose route metadata should be searched.
 * @param context - Current Hono request context.
 * @returns Whether the first matched endpoint is privacy-policy exempt.
 */
export function isRegisteredPrivacyPolicyExemptRoute(
    app: RouteApp,
    context: HonoRequestContext,
): boolean {
    return matchedRouteMetadata(app, context)?.privacyPolicyExempt ?? false;
}
