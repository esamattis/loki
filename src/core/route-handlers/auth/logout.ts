import type { App, AppRequestContext } from "@/core/create-app";
import { destroySession } from "@/route-handlers/auth/sessions";
import * as routes from "@/core/routes";

export function register(app: App) {
    app.post(routes.auth.logout.route, handleLogout);
}

async function handleLogout(c: AppRequestContext) {
    await destroySession(c);
    return c.redirect(routes.auth.login({}));
}
