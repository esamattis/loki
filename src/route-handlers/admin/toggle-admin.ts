import { eq } from "drizzle-orm";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import { requireAdmin } from "@/route-handlers/admin/helpers";
import * as routes from "@/routes";
import { users } from "@/schema";

async function handleToggleAdmin(c: AppRequestContext) {
    if (!requireAdmin(c)) {
        return c.notFound();
    }

    const formData = await c.req.formData();
    const uuidValue = formData.get("uuid");
    const uuid = typeof uuidValue === "string" ? uuidValue : "";
    if (!uuid) {
        return c.redirect(routes.admin.index({}));
    }

    const db = getAppContext(c).db;
    const target = await db
        .select({
            uuid: users.uuid,
            admin: users.admin,
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
        .set({ admin: !target.admin })
        .where(eq(users.uuid, uuid))
        .run();

    return c.redirect(routes.admin.index({}));
}

export function register(app: App) {
    app.post(routes.admin.toggleAdmin.route, handleToggleAdmin);
}
