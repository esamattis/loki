import { eq, or } from "drizzle-orm";
import type { RequestContext } from "@/core/create-app";
import { User } from "@/core/user";
import { verifyPassword } from "@/core/password";
import { users } from "@/core/schema";

/** Stores the session token bytes used by this module. */
const SESSION_TOKEN_BYTES = 32; // 256 bits

export { hashPassword } from "@/core/password";

/** Stores the session cookie name used by this module. */
export const SESSION_COOKIE_NAME = "session";
/** Stores the session max age used by this module. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Cookie options; `secure` follows the request protocol (HTTPS on Cloudflare). */
export function sessionCookieOptions(requestUrl: string) {
    return {
        path: "/",
        httpOnly: true,
        sameSite: "Lax" as const,
        secure: new URL(requestUrl).protocol === "https:",
    };
}

/** Relative same-origin path only; rejects protocol-relative and other open-redirect forms. */
export function isSafeRedirectPath(path: string | undefined): path is string {
    if (!path) {
        return false;
    }
    if (!path.startsWith("/") || path.startsWith("//")) {
        return false;
    }
    if (path.includes("\\") || path.includes("://")) {
        return false;
    }
    for (let i = 0; i < path.length; i++) {
        const code = path.charCodeAt(i);
        if (code <= 0x1f || code === 0x7f) {
            return false;
        }
    }
    return true;
}

/** Encodes bytes as a Base64 string. */
export function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

/** Generates session token. */
export function generateSessionToken(): string {
    const bytes = crypto.getRandomValues(
        new Uint8Array(new ArrayBuffer(SESSION_TOKEN_BYTES)),
    );
    // base64url, no padding — cookie-safe
    const b64 = bytesToBase64(bytes);
    return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

/** Hashes a session token for persistent storage. */
export async function hashToken(token: string): Promise<string> {
    const data = new TextEncoder().encode(token);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const bytes = new Uint8Array(digest);
    let hex = "";
    for (const byte of bytes) {
        hex += byte.toString(16).padStart(2, "0");
    }
    return hex;
}

/** Parses an HTTP Basic Authorization header into username and password. */
export function parseBasicAuth(
    header: string | undefined,
): [string, string] | null {
    if (!header) {
        return null;
    }
    const match = /^Basic\s+(.+)$/i.exec(header);
    if (!match) {
        return null;
    }
    const encoded = match[1] ?? "";
    let decoded: string;
    try {
        decoded = atob(encoded);
    } catch {
        return null;
    }
    const separator = decoded.indexOf(":");
    if (separator === -1) {
        return null;
    }
    return [decoded.slice(0, separator), decoded.slice(separator + 1)];
}

/**
 * Looks up a user by username or email and verifies the password.
 * Returns the user record (without the password hash) when valid, otherwise null.
 */
export async function findUserForAuth(
    db: RequestContext["db"],
    usernameOrEmail: string,
    password: string,
): Promise<User | null> {
    const userRow = await db
        .select({
            uuid: users.uuid,
            username: users.username,
            displayName: users.displayName,
            email: users.email,
            options: users.options,
            password: users.password,
            admin: users.admin,
            htmlCacheGeneration: users.htmlCacheGeneration,
        })
        .from(users)
        .where(
            or(
                eq(users.username, usernameOrEmail),
                eq(users.email, usernameOrEmail),
            ),
        )
        .limit(1)
        .get();

    if (!userRow || !(await verifyPassword(password, userRow.password))) {
        return null;
    }
    return new User(db, userRow);
}
