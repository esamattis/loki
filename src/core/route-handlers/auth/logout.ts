import type { AppRouter, HonoRequestContext } from "@/core/create-app";
import { destroySession } from "@/core/route-handlers/auth/sessions";
import * as routes from "@/core/routes";

/** Registers the logout route. */
export function register(app: AppRouter) {
    app.post(routes.auth.logout, handleLogout);
}

/** Handles logout. */
async function handleLogout(c: HonoRequestContext) {
    await destroySession(c);
    return c.redirect(routes.auth.login({}));
}
