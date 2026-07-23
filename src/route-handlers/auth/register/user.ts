import { and, eq, gt, sql } from "drizzle-orm";
import type { AppDatabase } from "@/db";
import type { UserOptions } from "@/options";
import { invitations, users } from "@/schema";

export interface RegistrationUserValues {
    username: string;
    displayName?: string;
    email: string;
    passwordHash: string;
    options: UserOptions;
}

export type RegistrationUserResult =
    | { uuid: string }
    | { error: "Invitation code is required" }
    | { error: "Invalid or exhausted invitation code" };

async function insertFirstUser(
    db: AppDatabase,
    values: RegistrationUserValues,
): Promise<string | undefined> {
    const uuid = crypto.randomUUID();
    const created = await db.get<{ uuid: string }>(sql`
        INSERT INTO users (
            uuid, username, display_name, password, email,
            invitation_code, options, admin, created_at
        )
        SELECT
            ${uuid}, ${values.username}, ${values.displayName || null},
            ${values.passwordHash}, ${values.email}, NULL,
            ${JSON.stringify(values.options)}, 1, unixepoch()
        WHERE NOT EXISTS (
            SELECT 1 FROM users
            WHERE coalesce(json_extract(options, '$.readonly'), 0) = 0
        )
        RETURNING uuid
    `);
    return created?.uuid;
}

async function consumeInvitation(
    db: AppDatabase,
    invitationCode: string,
): Promise<boolean> {
    const consumed = await db
        .update(invitations)
        .set({ count: sql`${invitations.count} - 1` })
        .where(
            and(eq(invitations.code, invitationCode), gt(invitations.count, 0)),
        )
        .returning({ code: invitations.code })
        .get();
    return Boolean(consumed);
}

export async function createRegistrationUser(
    db: AppDatabase,
    values: RegistrationUserValues,
    invitationCode?: string,
): Promise<RegistrationUserResult> {
    const firstUserUuid = await insertFirstUser(db, values);
    if (firstUserUuid) return { uuid: firstUserUuid };

    if (!invitationCode) return { error: "Invitation code is required" };
    if (!(await consumeInvitation(db, invitationCode))) {
        return { error: "Invalid or exhausted invitation code" };
    }

    const uuid = crypto.randomUUID();
    const createdAt = Math.floor(Date.now() / 1000);
    await db
        .insert(users)
        .values({
            uuid,
            username: values.username,
            displayName: values.displayName || null,
            email: values.email,
            password: values.passwordHash,
            invitationCode,
            options: JSON.stringify(values.options),
            admin: false,
            createdAt,
        })
        .run();
    return { uuid };
}
