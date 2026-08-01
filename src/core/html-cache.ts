import { eq, sql } from "drizzle-orm";
import { gitRevision } from "@/core/build-info";
import {
    getRequestContext,
    type HonoRequestContext,
    type User,
} from "@/core/create-app";
import * as routes from "@/core/routes";
import { users } from "@/core/schema";
import { isSafeHttpMethod } from "@/core/http-methods";

/** Stores the cache name used by this module. */
const CACHE_NAME = "loki-html-v1";
/** Stores the cache ttl seconds used by this module. */
const CACHE_TTL_SECONDS = 5 * 60;
/** Stores the readonly cache ttl seconds used by this module. */
const READONLY_CACHE_TTL_SECONDS = 60 * 60 * 24;
/** Stores the cache status header used by this module. */
const CACHE_STATUS_HEADER = "X-Loki-HTML-Cache";

/** Describes cache status. */
type CacheStatus = "HIT" | "MISS" | "DISABLED" | "BYPASS";

/** Returns whether cache api available. */
function cacheApiAvailable(): boolean {
    return typeof caches !== "undefined";
}

/** Returns whether path. */
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
function cacheKey(c: HonoRequestContext, user: User): Request {
    const url = new URL(c.req.url);
    const build = encodeURIComponent(gitRevision || "development");
    const userUuid = encodeURIComponent(user.uuid);
    const admin = user.admin ? "admin" : "user";
    url.pathname = `/__loki-html-cache/${build}/${userUuid}/${user.htmlCacheGeneration}/${admin}${url.pathname}`;
    return new Request(url, { method: "GET" });
}

/** Builds for client. */
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

/** Builds cache. */
async function bypassCache(
    c: HonoRequestContext,
    next: () => Promise<void>,
    cacheStatus: "DISABLED" | "BYPASS",
) {
    await next();
    c.header(CACHE_STATUS_HEADER, cacheStatus);
}

/** Builds for cache. */
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

/** Returns whether response. */
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

/** Invalidates user cache. */
async function invalidateUserCache(c: HonoRequestContext, userUuid: string) {
    const ctx = getRequestContext(c);
    await ctx.db
        .update(users)
        .set({
            htmlCacheGeneration: sql`${users.htmlCacheGeneration} + 1`,
        })
        .where(eq(users.uuid, userUuid))
        .run();
}

/** Handles a request that may mutate user-visible state. */
async function handleMutation(
    c: HonoRequestContext,
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

/** Caches eligible HTML responses and invalidates user entries after writes. */
export async function htmlCacheMiddleware(
    c: HonoRequestContext,
    next: () => Promise<void>,
) {
    if (
        (import.meta.env.DEV && !process.env.PLAYWRIGHT_TEST) ||
        !cacheApiAvailable()
    ) {
        return bypassCache(c, next, "BYPASS");
    }

    const user = getRequestContext(c).user;
    if (!user) {
        return bypassCache(c, next, "BYPASS");
    }
    if (!isSafeHttpMethod(c.req.method.toUpperCase())) {
        await handleMutation(c, next, user);
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
