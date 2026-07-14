import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { resolve } from "node:path";
import { app } from "@/app/app";
import { registerRoutes } from "@/app/register-routes";
import { createSqliteDatabase, resolveSqlitePath } from "@/db-sqlite";
import { migrateSqlite } from "@/migrate-sqlite";
registerRoutes(app);

const sqlitePath = resolveSqlitePath();
const {
    db,
    sqlite,
    path: absoluteSqlitePath,
} = createSqliteDatabase(sqlitePath);

migrateSqlite(sqlite);

const publicRoot = resolve("public");
const distClientRoot = resolve("dist/client");

app.use(
    "/assets/*",
    serveStatic({
        root: distClientRoot,
    }),
);

app.use(
    "/*",
    serveStatic({
        root: publicRoot,
    }),
);

app.use(
    "/*",
    serveStatic({
        root: distClientRoot,
    }),
);

const port = Number(process.env.PORT) || 8787;
const hostname = process.env.HOST || "127.0.0.1";

function fetch(
    request: Request,
    env?: Record<string, unknown>,
    executionCtx?: Parameters<typeof app.fetch>[2],
): Response | Promise<Response> {
    return app.fetch(
        request,
        {
            ...env,
            APP_DB: db,
        },
        executionCtx,
    );
}

serve(
    {
        fetch,
        port,
        hostname,
    },
    (info) => {
        console.log(
            `Self-hosted Jump Logbook listening on http://${info.address}:${info.port}`,
        );
        console.log(`SQLite database: ${absoluteSqlitePath}`);
    },
);
