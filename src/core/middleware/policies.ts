import type { AppRouter, HonoRequestContext } from "@/core/create-app";
import { getRequestContext } from "@/core/create-app";
import { htmlCacheMiddleware } from "@/core/html-cache";
import { isPublicAssetPath } from "@/core/middleware/public-assets";
import { isRegisteredPrivacyPolicyExemptRoute } from "@/core/register-route";
import * as routes from "@/core/routes";

/** Stores the privacy policy allowed paths used by this module. */
const PRIVACY_POLICY_ALLOWED_PATHS = new Set<string>([
    routes.privacy.route,
    routes.auth.logout.route,
    routes.serviceWorker.route,
]);

/** Stores the readonly allowed mutations used by this module. */
const READONLY_ALLOWED_MUTATIONS = new Set<string>([
    // A read-only user must still be able to end their session.
    routes.auth.logout.route,
    // Privacy acceptance and account deletion remain available to every user.
    routes.privacy.route,
]);

// All unlisted methods are mutation-capable and therefore denied by default.
/** Stores the safe methods used by this module. */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Requires authenticated users to accept the current privacy policy. */
async function privacyPolicyMiddleware(
    c: HonoRequestContext,
    next: () => Promise<void>,
) {
    const ctx = getRequestContext(c);
    if (
        ctx.isSelfHosted() ||
        isPublicAssetPath(c.req.path) ||
        isRegisteredPrivacyPolicyExemptRoute(ctx.appRouter, c) ||
        !ctx.user ||
        ctx.user.options.privacyPolicyAccepted ||
        PRIVACY_POLICY_ALLOWED_PATHS.has(c.req.path)
    ) {
        return next();
    }

    const url = ctx.url();
    return c.redirect(routes.privacy({}, { back: url.pathname + url.search }));
}

/** Rejects mutations that are unavailable to read-only users. */
async function readonlyMiddleware(
    c: HonoRequestContext,
    next: () => Promise<void>,
) {
    if (SAFE_METHODS.has(c.req.method.toUpperCase())) {
        return next();
    }
    const user = getRequestContext(c).user;
    if (!user?.readonly) {
        return next();
    }
    if (READONLY_ALLOWED_MUTATIONS.has(c.req.path)) {
        return next();
    }
    return c.redirect(routes.readonly({}));
}

/** Registers policies. */
export function registerPolicies(app: AppRouter): void {
    app.use("*", privacyPolicyMiddleware);
    app.use("*", readonlyMiddleware);
    app.use("*", htmlCacheMiddleware);
}
