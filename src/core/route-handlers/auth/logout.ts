import type { AppRouter, HonoRequestContext } from "@/core/create-app";
import { destroySession } from "@/core/route-handlers/auth/sessions";
import * as routes from "@/core/routes";

export function register(app: AppRouter) {
    app.post(routes.auth.logout, handleLogout);
}

async function handleLogout(c: HonoRequestContext) {
    await destroySession(c);
    return c.redirect(routes.auth.login({}));
}
