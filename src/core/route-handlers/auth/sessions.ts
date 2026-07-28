import { eq } from "drizzle-orm";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { getRequestContext, type HonoRequestContext } from "@/core/create-app";
import {
    generateSessionToken,
    hashToken,
    SESSION_COOKIE_NAME,
    sessionCookieOptions,
    SESSION_MAX_AGE,
} from "@/core/auth";
import { sessions } from "@/core/schema";

/** Creates session. */
export async function createSession(
    c: HonoRequestContext,
    userUuid: string,
): Promise<void> {
    const token = generateSessionToken();
    const tokenHash = await hashToken(token);
    const now = Math.floor(Date.now() / 1000);

    await getRequestContext(c)
        .db.insert(sessions)
        .values({
            tokenHash,
            userUuid,
            createdAt: now,
            expiresAt: now + SESSION_MAX_AGE,
            lastUsedAt: now,
        })
        .run();

    setCookie(c, SESSION_COOKIE_NAME, token, {
        ...sessionCookieOptions(c.req.url),
        maxAge: SESSION_MAX_AGE,
    });
}

/** Deletes session. */
export async function destroySession(c: HonoRequestContext): Promise<void> {
    const token = getCookie(c, SESSION_COOKIE_NAME);
    if (token) {
        const tokenHash = await hashToken(token);
        await getRequestContext(c)
            .db.delete(sessions)
            .where(eq(sessions.tokenHash, tokenHash))
            .run();
    }
    deleteCookie(c, SESSION_COOKIE_NAME, sessionCookieOptions(c.req.url));
}
