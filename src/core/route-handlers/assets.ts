import { htmxAsset, tailwindAsset } from "@/core/app-assets";
import type { App } from "@/core/create-app";
import * as routes from "@/core/routes";

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

export function registerAssetRoutes(app: App) {
    app.get(routes.assets.tailwindCss.route, (c) => {
        if (
            routes.assets.tailwindCss.params(c).fingerprint !==
            tailwindAsset.fingerprint
        ) {
            return c.notFound();
        }
        return c.body(tailwindAsset.content, 200, {
            "Cache-Control": IMMUTABLE_CACHE_CONTROL,
            "Content-Type": "text/css; charset=utf-8",
        });
    });
    app.get(routes.assets.htmxScript.route, (c) => {
        if (
            routes.assets.htmxScript.params(c).fingerprint !==
            htmxAsset.fingerprint
        ) {
            return c.notFound();
        }
        return c.body(htmxAsset.content, 200, {
            "Cache-Control": IMMUTABLE_CACHE_CONTROL,
            "Content-Type": "text/javascript; charset=utf-8",
        });
    });
}
