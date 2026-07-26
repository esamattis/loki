import type { Handler } from "hono";
import type { App, Env } from "@/core/create-app";
type RegisteredRoute = {
    readonly route: string;
    readonly metadata: { readonly public: boolean };
};

const publicPatterns = new WeakMap<App, Set<string>>();

function accessSet(app: App): Set<string> {
    let patterns = publicPatterns.get(app);
    if (!patterns) {
        patterns = new Set();
        publicPatterns.set(app, patterns);
    }
    return patterns;
}

export function registerRoute(
    app: App,
    registration: {
        method: "get" | "post" | "put" | "delete" | "patch";
        route: RegisteredRoute;
        handler: Handler<Env>;
    },
): void {
    registerRouteAccess(app, registration.route);
    app.on(
        registration.method.toUpperCase(),
        registration.route.route,
        registration.handler,
    );
}

export function registerRouteAccess(app: App, route: RegisteredRoute): void {
    if (route.metadata.public) accessSet(app).add(route.route);
}

export function isRegisteredPublicPath(app: App, path: string): boolean {
    for (const pattern of accessSet(app)) {
        const expression = new RegExp(
            `^${pattern.replace(/:[^/]+/g, "[^/]+")}$`,
        );
        if (expression.test(path)) return true;
    }
    return false;
}
