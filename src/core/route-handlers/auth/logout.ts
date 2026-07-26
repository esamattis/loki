import { registerRoute } from "@/core/register-route";
import type { App, AppRequestContext } from "@/core/create-app";
import { destroySession } from "@/core/route-handlers/auth/sessions";
import * as routes from "@/core/routes";

export function register(app: App) {
    registerRoute(app, "post", routes.auth.logout, handleLogout);
}

async function handleLogout(c: AppRequestContext) {
    await destroySession(c);
    return c.redirect(routes.auth.login({}));
}
