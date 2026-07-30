import { deleteCookie, getCookie } from "hono/cookie";
import { eq, lte, sql } from "drizzle-orm";
import {
    findUserForAuth,
    hashToken,
    isSafeRedirectPath,
    parseBasicAuth,
    SESSION_COOKIE_NAME,
    sessionCookieOptions,
    SESSION_MAX_AGE,
} from "@/core/auth";
import type { AppRouter, HonoRequestContext } from "@/core/create-app";
import { getRequestContext } from "@/core/create-app";
import type { AppDatabase } from "@/core/db";
import { isPublicAssetPath } from "@/core/middleware/public-assets";
import { isRegisteredPublicRoute } from "@/core/register-route";
import * as routes from "@/core/routes";
import { sessions, users } from "@/core/schema";
import { User } from "@/core/user";

/** Builds a Basic Authentication challenge response. */
function basicAuthChallenge(c: HonoRequestContext, realm: string) {
    return c.body("Invalid username or password", 401, {
        "WWW-Authenticate": `Basic realm="${realm}"`,
        "Content-Type": "text/plain; charset=utf-8",
    });
}

/** Returns whether registered users. */
async function hasRegisteredUsers(db: AppDatabase): Promise<boolean> {
    const user = await db
        .select({ uuid: users.uuid })
        .from(users)
        .where(
            sql`coalesce(json_extract(${users.options}, '$.readonly'), 0) = 0`,
        )
        .limit(1)
        .get();
    return Boolean(user);
}

/** Authenticates middleware. */
async function authenticateMiddleware(
    c: HonoRequestContext,
    next: () => Promise<void>,
) {
    const path = c.req.path;

    if (isPublicAssetPath(path)) return next();

    const ctx = getRequestContext(c);
    const isPublicPath = isRegisteredPublicRoute(ctx.appRouter, c);

    if (Math.random() < 0.1) {
        const now = Math.floor(Date.now() / 1000);
        await ctx.db.delete(sessions).where(lte(sessions.expiresAt, now)).run();
    }

    const sessionToken = getCookie(c, SESSION_COOKIE_NAME);

    if (sessionToken) {
        const tokenHash = await hashToken(sessionToken);
        const now = Math.floor(Date.now() / 1000);
        const row = await ctx.db
            .select({
                uuid: users.uuid,
                username: users.username,
                displayName: users.displayName,
                email: users.email,
                options: users.options,
                admin: users.admin,
                htmlCacheGeneration: users.htmlCacheGeneration,
                expiresAt: sessions.expiresAt,
                sessionLastUsedAt: sessions.lastUsedAt,
                userLastUsedAt: users.lastUsedAt,
            })
            .from(sessions)
            .innerJoin(users, eq(sessions.userUuid, users.uuid))
            .where(eq(sessions.tokenHash, tokenHash))
            .limit(1)
            .get();

        if (row && row.expiresAt > now) {
            const { expiresAt, sessionLastUsedAt, userLastUsedAt, ...userRow } =
                row;
            void expiresAt;
            ctx.user = new User(ctx.db, userRow);
            // Throttle last-used writes to once per 5 minutes
            if (sessionLastUsedAt <= now - 5 * 60) {
                await ctx.db
                    .update(sessions)
                    .set({
                        lastUsedAt: now,
                        expiresAt: now + SESSION_MAX_AGE,
                    })
                    .where(eq(sessions.tokenHash, tokenHash))
                    .run();
            }
            // User activity is less granular than individual session activity.
            if (userLastUsedAt <= now - 15 * 60) {
                await ctx.db
                    .update(users)
                    .set({ lastUsedAt: now })
                    .where(eq(users.uuid, userRow.uuid))
                    .run();
            }
        } else {
            if (row) {
                await ctx.db
                    .delete(sessions)
                    .where(eq(sessions.tokenHash, tokenHash))
                    .run();
            }
            deleteCookie(
                c,
                SESSION_COOKIE_NAME,
                sessionCookieOptions(c.req.url),
            );
        }
    }

    if (ctx.isSelfHosted() && path === "/") {
        return c.redirect(routes.auth.login({}));
    }

    if (
        !ctx.user &&
        path !== routes.auth.register.route &&
        path !== routes.privacy.route &&
        (path === "/" || path === routes.auth.login.route || !isPublicPath) &&
        !(await hasRegisteredUsers(ctx.db))
    ) {
        return c.redirect(routes.auth.register({}));
    }

    if (!ctx.user && !isPublicPath) {
        const authorization = c.req.header("Authorization");
        const credentials = parseBasicAuth(authorization);
        if (credentials) {
            const [usernameOrEmail, password] = credentials;
            const user = await findUserForAuth(
                ctx.db,
                usernameOrEmail,
                password,
            );
            if (user) {
                ctx.user = user;
            }
        }

        if (!ctx.user) {
            if (authorization) {
                return basicAuthChallenge(c, ctx.appOptions.basicAuthRealm);
            }
            const loginUrl = isSafeRedirectPath(path)
                ? routes.auth.login({}, { back: path })
                : routes.auth.login({});
            return c.redirect(loginUrl);
        }
    }

    await next();
}

/** Registers authentication. */
export function registerAuthentication(app: AppRouter): void {
    app.use("*", authenticateMiddleware);
}
