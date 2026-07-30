import type { Next } from "hono";
import type { AppRouter, HonoRequestContext } from "@/core/create-app";
import { staticAssets } from "@/app/routes";

function continueToStaticAsset(
    _context: HonoRequestContext,
    next: Next,
): Promise<void> {
    return next();
}

export function register(app: AppRouter): void {
    for (const route of staticAssets) {
        app.get(route, continueToStaticAsset);
    }
}
