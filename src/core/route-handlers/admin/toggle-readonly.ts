import { registerRoute } from "@/core/register-route";
import { eq } from "drizzle-orm";
import {
    getRequestContext,
    type AppRouter,
    type HonoRequestContext,
} from "@/core/create-app";
import { CoreUserOptionsSchema, parseCoreUserOptions } from "@/core/options";
import { requireAdmin } from "@/core/route-handlers/admin/helpers";
import * as routes from "@/core/routes";
import { users } from "@/core/schema";

async function handleToggleReadonly(c: HonoRequestContext) {
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
            options: users.options,
        })
        .from(users)
        .where(eq(users.uuid, uuid))
        .limit(1)
        .get();

    if (!target) {
        return c.notFound();
    }

    const options = parseCoreUserOptions(target.options);
    const nextOptions = CoreUserOptionsSchema.parse({
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

export function register(app: AppRouter) {
    registerRoute(
        app,
        "post",
        routes.admin.toggleReadonly,
        handleToggleReadonly,
    );
}
