import { app, getAppContext, type AppRequestContext } from "./app";
import "./login";
import "./preferences";
import "./logbook";
import "./admin";
import "./share-target";
import * as routes from "./routes";

function redirectFromHome(c: AppRequestContext) {
    const user = getAppContext(c).user;
    if (user) {
        return c.redirect(routes.logbook({}));
    }
    return c.redirect(routes.login({}));
}

app.get(routes.home.route, redirectFromHome);

export default {
    fetch: app.fetch,
};
