import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import * as routes from "@/routes";

function redirectFromHome(c: AppRequestContext) {
    return c.redirect(
        getAppContext(c).user
            ? routes.logbook.index({})
            : routes.auth.login({}),
    );
}

export function register(app: App) {
    app.get(routes.home.route, redirectFromHome);
}
