import type { Next } from "hono";
import type { App, AppRequestContext } from "@/core/create-app";
import { registerRoute } from "@/core/register-route";
import { staticAssets } from "@/app/routes";

function continueToStaticAsset(
    _context: AppRequestContext,
    next: Next,
): Promise<void> {
    return next();
}

export function register(app: App): void {
    for (const route of staticAssets) {
        registerRoute(app, "get", route, continueToStaticAsset);
    }
}
