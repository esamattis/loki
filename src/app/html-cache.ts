import { eq, sql } from "drizzle-orm";
import { gitRevision } from "@/build-info";
import { getAppContext, type AppRequestContext, type User } from "@/app/app";
import * as routes from "@/routes";
import { users } from "@/schema";

const CACHE_NAME = "loki-html-v1";
const CACHE_TTL_SECONDS = 5 * 60;
const READONLY_CACHE_TTL_SECONDS = 60 * 60 * 24;
const CACHE_STATUS_HEADER = "X-Loki-HTML-Cache";

type CacheStatus = "HIT" | "MISS" | "DISABLED" | "BYPASS";

function cacheApiAvailable(): boolean {
    return typeof caches !== "undefined";
}

function excludedPath(path: string): boolean {
    return (
        path === routes.preferences.route ||
        path === routes.admin.index.route ||
        path.startsWith(`${routes.admin.index.route}/`)
    );
}

/**
 * Cloudflare's Cache API identifies entries with GET Request objects. This
 * synthetic request is never fetched; its URL only namespaces the cached HTML
 * by build, user, generation, role, and the complete requested page URL.
 */
function cacheKey(c: AppRequestContext, user: User): Request {
    const url = new URL(c.req.url);
    const build = encodeURIComponent(gitRevision || "development");
    const userUuid = encodeURIComponent(user.uuid);
    const admin = user.admin ? "admin" : "user";
    url.pathname = `/__loki-html-cache/${build}/${userUuid}/${user.htmlCacheGeneration}/${admin}${url.pathname}`;
    return new Request(url, { method: "GET" });
}

function responseForClient(
    response: Response,
    cacheStatus: CacheStatus,
): Response {
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "private, no-store");
    headers.set(CACHE_STATUS_HEADER, cacheStatus);
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

async function bypassCache(
    c: AppRequestContext,
    next: () => Promise<void>,
    cacheStatus: "DISABLED" | "BYPASS",
) {
    await next();
    c.header(CACHE_STATUS_HEADER, cacheStatus);
}

function responseForCache(response: Response, user: User): Response {
    const ttlSeconds = user.readonly
        ? READONLY_CACHE_TTL_SECONDS
        : CACHE_TTL_SECONDS;
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", `public, max-age=${ttlSeconds}`);
    headers.delete("Server-Timing");
    headers.delete("X-Loki-SQL-Queries");
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

function cacheableResponse(response: Response): boolean {
    if (response.status !== 200 || response.headers.has("Set-Cookie")) {
        return false;
    }
    const contentType = response.headers.get("Content-Type");
    if (!contentType?.toLowerCase().startsWith("text/html")) {
        return false;
    }
    const cacheControl = response.headers.get("Cache-Control")?.toLowerCase();
    return !cacheControl?.includes("no-store");
}

async function invalidateUserCache(c: AppRequestContext, userUuid: string) {
    const ctx = getAppContext(c);
    await ctx.db
        .update(users)
        .set({
            htmlCacheGeneration: sql`${users.htmlCacheGeneration} + 1`,
        })
        .where(eq(users.uuid, userUuid))
        .run();
}

async function handlePost(
    c: AppRequestContext,
    next: () => Promise<void>,
    user: User,
) {
    try {
        await next();
    } finally {
        if (!user.readonly) {
            await invalidateUserCache(c, user.uuid);
        }
    }
}

export async function htmlCacheMiddleware(
    c: AppRequestContext,
    next: () => Promise<void>,
) {
    if (
        (import.meta.env.DEV && !process.env.PLAYWRIGHT_TEST) ||
        !cacheApiAvailable()
    ) {
        return bypassCache(c, next, "BYPASS");
    }

    const user = getAppContext(c).user;
    if (!user) {
        return bypassCache(c, next, "BYPASS");
    }
    if (c.req.method === "POST") {
        await handlePost(c, next, user);
        c.header(CACHE_STATUS_HEADER, "BYPASS");
        return;
    }
    if (!user.options.htmlCacheEnabled) {
        return bypassCache(c, next, "DISABLED");
    }
    if (c.req.method !== "GET" || excludedPath(c.req.path)) {
        return bypassCache(c, next, "BYPASS");
    }

    const cache = await caches.open(CACHE_NAME);
    const key = cacheKey(c, user);
    const cachedResponse = await cache.match(key);
    if (cachedResponse) {
        return responseForClient(cachedResponse, "HIT");
    }

    await next();
    if (!cacheableResponse(c.res)) {
        c.header(CACHE_STATUS_HEADER, "BYPASS");
        return;
    }

    const response = c.res;
    await cache.put(key, responseForCache(response.clone(), user));
    c.res = responseForClient(response, "MISS");
}
