import { createD1Database } from "@/core/db";
import { createServerTimings, setServerTiming } from "@/core/server-timing";
import type { AppRouter, HonoRequestContext } from "@/core/create-app";
import { RequestContext } from "@/core/create-app";

async function requestContextMiddleware(
    c: HonoRequestContext,
    next: () => Promise<void>,
    router: AppRouter,
) {
    const serverTimings = createServerTimings();
    c.set(
        "requestContext",
        new RequestContext({
            appRouter: router,
            db:
                c.env.APP_DB_FACTORY?.(serverTimings) ??
                createD1Database(c.env.DB, serverTimings),
            sqlitePath: c.env.APP_SQLITE_PATH,
            honoContext: c,
            serverTimings,
        }),
    );
    try {
        await next();
    } finally {
        setServerTiming(c, serverTimings);
    }
}

export function registerRequestContext(router: AppRouter): void {
    router.use("*", (c, next) => requestContextMiddleware(c, next, router));
}
