import { registerRoute } from "@/core/register-route";
import { eq } from "drizzle-orm";
import {
    getAppContext,
    type App,
    type AppRequestContext,
} from "@/core/create-app";
import { requireAdmin } from "@/core/route-handlers/admin/helpers";
import * as routes from "@/core/routes";
import { sessions } from "@/core/schema";

function formString(formData: FormData, name: string): string {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
}

async function handleSessions(c: AppRequestContext) {
    if (!requireAdmin(c)) {
        return c.notFound();
    }

    const formData = await c.req.formData();
    const action = formString(formData, "action");
    const db = getAppContext(c).db;

    if (action === "delete") {
        const tokenHash = formString(formData, "tokenHash");
        if (tokenHash) {
            await db
                .delete(sessions)
                .where(eq(sessions.tokenHash, tokenHash))
                .run();
        }
    } else if (action === "clear-user") {
        const userUuid = formString(formData, "userUuid");
        if (userUuid) {
            await db
                .delete(sessions)
                .where(eq(sessions.userUuid, userUuid))
                .run();
        }
    }

    return c.redirect(routes.admin.index({}));
}

export function register(app: App) {
    registerRoute(app, "post", routes.admin.sessions.index, handleSessions);
}
