import { eq } from "drizzle-orm";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import { requireAdmin } from "@/route-handlers/admin/helpers";
import { createSession } from "@/route-handlers/auth/sessions";
import * as routes from "@/routes";
import { users } from "@/schema";

async function handleLoginAs(c: AppRequestContext) {
    const admin = requireAdmin(c);
    if (!admin) {
        return c.notFound();
    }

    const formData = await c.req.formData();
    const uuidValue = formData.get("uuid");
    const uuid = typeof uuidValue === "string" ? uuidValue : "";
    if (!uuid) {
        return c.redirect(routes.admin.index({}));
    }

    const target = await getAppContext(c)
        .db.select({ uuid: users.uuid })
        .from(users)
        .where(eq(users.uuid, uuid))
        .limit(1)
        .get();

    if (!target) {
        return c.notFound();
    }

    await createSession(c, target.uuid);
    return c.redirect(routes.logbook.index({}));
}

export function register(app: App) {
    app.post(routes.admin.loginAs.route, handleLoginAs);
}
