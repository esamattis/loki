import type { Next } from "hono";
import type { AppRouter, HonoRequestContext } from "@/core/create-app";
import { registerRoute } from "@/core/register-route";
import { staticAssets } from "@/app/routes";

function continueToStaticAsset(
    _context: HonoRequestContext,
    next: Next,
): Promise<void> {
    return next();
}

export function register(app: AppRouter): void {
    for (const route of staticAssets) {
        registerRoute(app, "get", route, continueToStaticAsset);
    }
}
