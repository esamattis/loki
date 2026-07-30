import { eq } from "drizzle-orm";
import {
    getRequestContext,
    type AppRouter,
    type HonoRequestContext,
} from "@/core/create-app";
import { requireAdmin } from "@/core/route-handlers/admin/helpers";
import * as routes from "@/core/routes";
import { sessions } from "@/core/schema";

/** Reads an optional string from submitted form data. */
function formString(formData: FormData, name: string): string {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
}

/** Handles sessions. */
async function handleSessions(c: HonoRequestContext) {
    if (!requireAdmin(c)) {
        return c.notFound();
    }

    const formData = await c.req.formData();
    const action = formString(formData, "action");
    const db = getRequestContext(c).db;

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

/** Registers the administrative session routes. */
export function register(app: AppRouter) {
    app.post(routes.admin.sessions.index, handleSessions);
}
