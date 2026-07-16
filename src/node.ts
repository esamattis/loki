import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { command, number, option, run, string } from "cmd-ts";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { app } from "@/app/app";
import { registerRoutes } from "@/app/register-routes";
import { createSqliteDatabase } from "@/db-sqlite";
import { migrateSqlite } from "@/migrate-sqlite";
import { loadNodeNativeBinding, registerSeaStaticAssets } from "@/node-sea";

function registerStaticAssets(): void {
    if (registerSeaStaticAssets(app)) {
        return;
    }

    const distClientRoot = resolve("dist/client");
    app.use("/assets/*", serveStatic({ root: distClientRoot }));
    app.use("/*", serveStatic({ root: resolve("public") }));
    app.use("/*", serveStatic({ root: distClientRoot }));
}

function startServer(args: {
    host: string;
    port: number;
    sqliteDir: string;
}): void {
    registerRoutes(app);

    const { db, sqlite, path } = createSqliteDatabase(
        join(resolve(args.sqliteDir), "loki.sqlite"),
        loadNodeNativeBinding(),
    );
    migrateSqlite(sqlite);
    registerStaticAssets();

    serve(
        {
            fetch(request, env) {
                return app.fetch(request, {
                    ...env,
                    APP_DB: db,
                });
            },
            port: args.port,
            hostname: args.host,
        },
        (info) => {
            console.log(
                `Self-hosted Loki - Skydiving Logbook listening on http://${info.address}:${info.port}`,
            );
            console.log(`SQLite database: ${path}`);
        },
    );
}

const cli = command({
    name: "loki",
    description: "Run Loki - Skydiving Logbook with SQLite",
    args: {
        port: option({
            long: "port",
            type: number,
            defaultValue: () => 8787,
            description: "HTTP port",
        }),
        host: option({
            long: "host",
            type: string,
            defaultValue: () => "127.0.0.1",
            description: "Host address to bind",
        }),
        sqliteDir: option({
            long: "sqlite-dir",
            type: string,
            defaultValue: () => join(homedir(), ".local/share/loki/sqlite"),
            description: "Directory containing loki.sqlite",
        }),
    },
    handler: startServer,
});

run(cli, process.argv.slice(2)).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
