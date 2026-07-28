import { registerRoute } from "@/core/register-route";
import { eq } from "drizzle-orm";
import {
    getRequestContext,
    type AppRouter,
    type HonoRequestContext,
} from "@/core/create-app";
import { requireAdmin } from "@/core/route-handlers/admin/helpers";
import { createSession } from "@/core/route-handlers/auth/sessions";
import * as routes from "@/core/routes";
import { users } from "@/core/schema";

async function handleLoginAs(c: HonoRequestContext) {
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

    const target = await getRequestContext(c)
        .db.select({ uuid: users.uuid })
        .from(users)
        .where(eq(users.uuid, uuid))
        .limit(1)
        .get();

    if (!target) {
        return c.notFound();
    }

    await createSession(c, target.uuid);
    return c.redirect(getRequestContext(c).appOptions.authenticatedHome);
}

export function register(app: AppRouter) {
    registerRoute(app, "post", routes.admin.loginAs, handleLoginAs);
}
