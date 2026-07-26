import type { App, AppRequestContext } from "@/core/create-app";
import { getAppContext } from "@/core/create-app";
import { htmlCacheMiddleware } from "@/core/html-cache";
import { isRegisteredPublicPath } from "@/core/register-route";
import * as routes from "@/core/routes";

const PRIVACY_POLICY_ALLOWED_PATHS = new Set<string>([
    routes.privacy.route,
    routes.auth.logout.route,
    routes.serviceWorker.route,
]);

const READONLY_ALLOWED_POST_PATHS = new Set<string>([
    routes.auth.logout.route,
    routes.privacy.route,
]);

function isPublicAssetPath(path: string): boolean {
    return path.startsWith("/assets/");
}

async function privacyPolicyMiddleware(
    c: AppRequestContext,
    next: () => Promise<void>,
) {
    const ctx = getAppContext(c);
    if (
        ctx.isSelfHosted() ||
        isPublicAssetPath(c.req.path) ||
        isRegisteredPublicPath(ctx.app, c.req.path) ||
        !ctx.user ||
        ctx.user.options.privacyPolicyAccepted ||
        PRIVACY_POLICY_ALLOWED_PATHS.has(c.req.path)
    ) {
        return next();
    }

    const url = ctx.url();
    return c.redirect(routes.privacy({}, { back: url.pathname + url.search }));
}

async function readonlyMiddleware(
    c: AppRequestContext,
    next: () => Promise<void>,
) {
    if (c.req.method !== "POST") {
        return next();
    }
    const user = getAppContext(c).user;
    if (!user?.readonly) {
        return next();
    }
    if (READONLY_ALLOWED_POST_PATHS.has(c.req.path)) {
        return next();
    }
    return c.redirect(routes.readonly({}));
}

export function registerPolicies(app: App): void {
    app.use("*", privacyPolicyMiddleware);
    app.use("*", readonlyMiddleware);
    app.use("*", htmlCacheMiddleware);
}
