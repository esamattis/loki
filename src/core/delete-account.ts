import { eq } from "drizzle-orm";
import { getRequestContext, type HonoRequestContext } from "@/core/create-app";
import { destroySession } from "@/core/route-handlers/auth/sessions";
import { users } from "@/core/schema";

export async function deleteAccount(c: HonoRequestContext) {
    const ctx = getRequestContext(c);
    const user = ctx.getUser();
    await ctx.appOptions.beforeUserDeleted?.(ctx, user.uuid);
    await ctx.db.delete(users).where(eq(users.uuid, user.uuid));
    await destroySession(c);
}
