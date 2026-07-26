import { eq } from "drizzle-orm";
import { getAppContext, type AppRequestContext } from "@/core/create-app";
import { destroySession } from "@/core/route-handlers/auth/sessions";
import { users } from "@/core/schema";

export async function deleteAccount(c: AppRequestContext) {
    const ctx = getAppContext(c);
    const user = ctx.getUser();
    await ctx.appOptions.beforeUserDeleted?.(ctx, user.uuid);
    await ctx.db.delete(users).where(eq(users.uuid, user.uuid));
    await destroySession(c);
}
