import type { AppRouter } from "@/core/create-app";
import { extname } from "node:path";
import { getAsset, getAssetKeys, isSea } from "node:sea";

/** Stores the content types used by this module. */
const CONTENT_TYPES: Record<string, string> = {
    ".css": "text/css; charset=utf-8",
    ".ico": "image/x-icon",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
};

/** Registers sea static assets. */
export function registerSeaStaticAssets(app: AppRouter): boolean {
    if (!isSea()) {
        return false;
    }

    const assetKeys = new Set(getAssetKeys());
    app.use("/*", async (c, next) => {
        const key = `client${c.req.path}`;
        if (!assetKeys.has(key)) {
            return next();
        }

        return c.body(getAsset(key), 200, {
            "Content-Type":
                CONTENT_TYPES[extname(c.req.path)] ??
                "application/octet-stream",
        });
    });
    return true;
}
