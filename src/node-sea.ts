import type { App } from "@/app/app";
import { createRequire } from "node:module";
import { extname, join } from "node:path";
import { getAsset, getAssetKeys, isSea } from "node:sea";
import { tmpdir } from "node:os";
import { rmSync, writeFileSync } from "node:fs";

const CONTENT_TYPES: Record<string, string> = {
    ".css": "text/css; charset=utf-8",
    ".ico": "image/x-icon",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
};

function seaNativeBindingPath(): string {
    const path = join(tmpdir(), `loki-better-sqlite3-${process.pid}.node`);
    writeFileSync(path, new Uint8Array(getAsset("native/better_sqlite3.node")));
    if (process.platform !== "win32") {
        process.once("exit", () => rmSync(path, { force: true }));
    }
    return path;
}

export function loadNodeNativeBinding(): object {
    const require = createRequire(import.meta.url);
    const path = isSea()
        ? seaNativeBindingPath()
        : require.resolve("better-sqlite3/build/Release/better_sqlite3.node");
    const binding: unknown = require(path);
    if (!binding || typeof binding !== "object") {
        throw new Error("Could not load the SQLite native addon");
    }
    return binding;
}

export function registerSeaStaticAssets(app: App): boolean {
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
