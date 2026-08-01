import { eq } from "drizzle-orm";
import { getRequestContext, type HonoRequestContext } from "@/core/create-app";
import { destroySession } from "@/core/route-handlers/auth/sessions";
import { users } from "@/core/schema";

/** Deletes account. */
export async function deleteAccount(c: HonoRequestContext) {
    const ctx = getRequestContext(c);
    const user = ctx.getUser();
    const appQueries =
        (await ctx.appOptions.prepareUserDeletion?.(ctx, user.uuid)) ?? [];
    const deleteUser = ctx.db.delete(users).where(eq(users.uuid, user.uuid));
    const [firstAppQuery, ...remainingAppQueries] = appQueries;
    await ctx.db.batch(
        firstAppQuery
            ? [firstAppQuery, ...remainingAppQueries, deleteUser]
            : [deleteUser],
    );
    await destroySession(c);
}
