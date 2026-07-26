import { createD1Database } from "@/core/db";
import { createServerTimings, setServerTiming } from "@/core/server-timing";
import type { App, AppRequestContext } from "@/core/create-app";
import { AppContext } from "@/core/create-app";

async function appContextMiddleware(
    c: AppRequestContext,
    next: () => Promise<void>,
    app: App,
) {
    const serverTimings = createServerTimings();
    c.set(
        "appContext",
        new AppContext({
            app,
            db:
                c.env.APP_DB_FACTORY?.(serverTimings) ??
                createD1Database(c.env.DB, serverTimings),
            sqlitePath: c.env.APP_SQLITE_PATH,
            requestContext: c,
            serverTimings,
        }),
    );
    try {
        await next();
    } finally {
        setServerTiming(c, serverTimings);
    }
}

export function registerAppContext(app: App): void {
    app.use("*", (c, next) => appContextMiddleware(c, next, app));
}
