import { eq } from "drizzle-orm";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import { parseUserOptions, UserOptionsSchema } from "@/options";
import { requireAdmin } from "@/route-handlers/admin/helpers";
import * as routes from "@/routes";
import { users } from "@/schema";

async function handleToggleReadonly(c: AppRequestContext) {
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
            options: users.options,
        })
        .from(users)
        .where(eq(users.uuid, uuid))
        .limit(1)
        .get();

    if (!target) {
        return c.notFound();
    }

    const options = parseUserOptions(target.options);
    const nextOptions = UserOptionsSchema.parse({
        ...options,
        readonly: !options.readonly,
    });
    await db
        .update(users)
        .set({ options: JSON.stringify(nextOptions) })
        .where(eq(users.uuid, uuid))
        .run();

    return c.redirect(routes.admin.index({}));
}

export function register(app: App) {
    app.post(routes.admin.toggleReadonly.route, handleToggleReadonly);
}
