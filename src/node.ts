import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { command, flag, number, option, run, string } from "cmd-ts";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { isSea } from "node:sea";
import { app } from "@/app/app";
import { registerRoutes } from "@/app/register-routes";
import { createSqliteDatabase } from "@/db-sqlite";
import { migrateSqlite } from "@/migrate-sqlite";
import { loadNodeNativeBinding, registerSeaStaticAssets } from "@/node-sea";
import { buildTitle } from "@/build-info";

function registerStaticAssets(): void {
    if (registerSeaStaticAssets(app)) {
        return;
    }

    const distClientRoot = resolve("dist/client");
    app.use("/assets/*", serveStatic({ root: distClientRoot }));
    app.use("/*", serveStatic({ root: resolve("public") }));
    app.use("/*", serveStatic({ root: distClientRoot }));
}

function openBrowser(url: string): void {
    const [command, args] =
        process.platform === "win32"
            ? ["cmd.exe", ["/c", "start", "", url]]
            : process.platform === "darwin"
              ? ["open", [url]]
              : ["xdg-open", [url]];
    const child = spawn(command, args, {
        detached: true,
        stdio: "ignore",
    });
    child.once("error", (error) => {
        console.error(`Failed to open ${url} in the default browser`, error);
    });
    child.once("exit", (code) => {
        if (code !== 0) {
            console.error(
                `Failed to open ${url} in the default browser (exit code ${String(code)})`,
            );
        }
    });
    child.unref();
}

function hasGraphicalSession(): boolean {
    if (process.platform !== "linux") {
        return true;
    }
    return Boolean(
        process.env.DISPLAY ??
        process.env.WAYLAND_DISPLAY ??
        process.env.MIR_SOCKET,
    );
}

function startServer(args: {
    host: string;
    noOpen: boolean;
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
            const url = `http://${info.address}:${info.port}`;
            console.log(
                `Self-hosted Loki - Skydiving Logbook listening on ${url}`,
            );
            console.log(`SQLite database: ${path}`);
            if (isSea() && !args.noOpen && hasGraphicalSession()) {
                openBrowser(url);
            }
        },
    );
}

const cli = command({
    name: "loki",
    version: buildTitle,
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
        noOpen: flag({
            long: "no-open",
            description: "Do not open the app in the default browser",
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
