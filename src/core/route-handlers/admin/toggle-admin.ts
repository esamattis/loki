import { and, eq, or, sql } from "drizzle-orm";
import {
    getRequestContext,
    type AppRouter,
    type HonoRequestContext,
} from "@/core/create-app";
import { requireAdmin } from "@/core/route-handlers/admin/helpers";
import * as routes from "@/core/routes";
import { users } from "@/core/schema";

async function handleToggleAdmin(c: HonoRequestContext) {
    if (!requireAdmin(c)) {
        return c.notFound();
    }

    const formData = await c.req.formData();
    const uuidValue = formData.get("uuid");
    const uuid = typeof uuidValue === "string" ? uuidValue : "";
    if (!uuid) {
        return c.redirect(routes.admin.index({}));
    }

    const db = getRequestContext(c).db;
    const target = await db
        .select({
            uuid: users.uuid,
        })
        .from(users)
        .where(eq(users.uuid, uuid))
        .limit(1)
        .get();

    if (!target) {
        return c.notFound();
    }

    await db
        .update(users)
        .set({ admin: sql`not ${users.admin}` })
        .where(
            and(
                eq(users.uuid, uuid),
                or(
                    eq(users.admin, false),
                    sql`exists (
                        select 1
                        from ${users} as other_admin
                        where other_admin.admin = 1
                          and other_admin.uuid <> ${uuid}
                    )`,
                ),
            ),
        )
        .run();

    return c.redirect(routes.admin.index({}));
}

export function register(app: AppRouter) {
    app.post(routes.admin.toggleAdmin, handleToggleAdmin);
}
