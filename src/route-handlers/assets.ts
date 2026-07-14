import htmx from "htmx.org/dist/htmx.esm.js?raw";
import tailwind from "@/tailwind.css?inline";
import type { App } from "@/app/app";
import * as routes from "@/routes";

export function registerAssetRoutes(app: App) {
    app.get(routes.assets.tailwindCss.route, (c) =>
        c.body(tailwind, 200, { "Content-Type": "text/css; charset=utf-8" }),
    );
    app.get(routes.assets.htmxScript.route, (c) =>
        c.body(htmx, 200, {
            "Content-Type": "text/javascript; charset=utf-8",
        }),
    );
}
