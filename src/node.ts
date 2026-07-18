import { createAdaptorServer, type ServerType } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { command, flag, number, option, run, string } from "cmd-ts";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { isSea } from "node:sea";
import { app } from "@/app/app";
import { registerRoutes } from "@/app/register-routes";
import {
    createSqliteDatabase,
    createSqliteDrizzleDatabase,
    defaultSqliteDirectory,
} from "@/db-sqlite";
import { migrateSqlite } from "@/migrate-sqlite";
import { registerSeaStaticAssets } from "@/node-sea";
import { buildTitle } from "@/build-info";

const DEFAULT_PORT = 8787;
const DEFAULT_PORT_RETRIES = 5;

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
    console.log(`Opening ${url} in the default browser`);
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

function hasExplicitPortArgument(argv: string[]): boolean {
    return argv.some(
        (argument) => argument === "--port" || argument.startsWith("--port="),
    );
}

function listenOnPort(
    server: ServerType,
    hostname: string,
    port: number,
): Promise<AddressInfo> {
    return new Promise((resolvePromise, rejectPromise) => {
        function cleanup(): void {
            server.removeListener("error", handleError);
            server.removeListener("listening", handleListening);
        }

        function handleError(error: Error): void {
            cleanup();
            rejectPromise(error);
        }

        function handleListening(): void {
            cleanup();
            const address = server.address();
            if (address === null || typeof address === "string") {
                rejectPromise(new Error("Server has no TCP address"));
                return;
            }
            resolvePromise(address);
        }

        server.once("error", handleError);
        server.once("listening", handleListening);
        server.listen(port, hostname);
    });
}

async function listenOnAvailablePort(
    server: ServerType,
    options: { hostname: string; initialPort: number; retries: number },
): Promise<AddressInfo> {
    for (let attempt = 0; attempt <= options.retries; attempt += 1) {
        try {
            return await listenOnPort(
                server,
                options.hostname,
                options.initialPort + attempt,
            );
        } catch (error) {
            const canRetry =
                error instanceof Error &&
                "code" in error &&
                error.code === "EADDRINUSE" &&
                attempt < options.retries;
            if (!canRetry) {
                throw error;
            }
            console.log(
                `Port ${String(options.initialPort + attempt)} is in use, trying ${String(options.initialPort + attempt + 1)}`,
            );
        }
    }
    throw new Error("Failed to find an available port");
}

async function startServer(args: {
    host: string;
    noOpen: boolean;
    port: number;
    sqliteDir: string;
}): Promise<void> {
    registerRoutes(app);

    const { sqlite, path } = createSqliteDatabase(
        join(resolve(args.sqliteDir), "loki.sqlite"),
    );
    const selfContained = isSea();
    migrateSqlite(sqlite);
    registerStaticAssets();

    const retries = hasExplicitPortArgument(process.argv.slice(2))
        ? 0
        : DEFAULT_PORT_RETRIES;

    const server = createAdaptorServer({
        fetch(request, env) {
            return app.fetch(request, {
                ...env,
                APP_DB_FACTORY: (timings) =>
                    createSqliteDrizzleDatabase(sqlite, timings),
                APP_SQLITE_PATH: selfContained ? path : undefined,
            });
        },
    });
    const info = await listenOnAvailablePort(server, {
        hostname: args.host,
        initialPort: args.port,
        retries,
    });
    const url = `http://${info.address}:${info.port}`;
    console.log(`Self-hosted Loki - Skydiving Logbook listening on ${url}`);
    console.log(`SQLite database: ${path}`);
    if (selfContained && !args.noOpen && hasGraphicalSession()) {
        openBrowser(url);
    }
}

function runSmokeTest(): void {
    const directory = mkdtempSync(join(tmpdir(), "loki-smoke-test-"));
    try {
        const { sqlite } = createSqliteDatabase(join(directory, "loki.sqlite"));
        try {
            migrateSqlite(sqlite);
            sqlite.exec(
                "CREATE TABLE smoke_test (value TEXT NOT NULL); INSERT INTO smoke_test VALUES ('ok')",
            );
            const result = sqlite.prepare("SELECT value FROM smoke_test").get();
            if (result?.value !== "ok") {
                throw new Error(
                    "SQLite smoke test returned an unexpected value",
                );
            }
        } finally {
            sqlite.close();
        }
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
    console.log("Executable smoke test passed");
}

const cli = command({
    name: "loki",
    version: buildTitle,
    description: "Run Loki - Skydiving Logbook with SQLite",
    args: {
        port: option({
            long: "port",
            type: number,
            defaultValue: () => DEFAULT_PORT,
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
            defaultValue: defaultSqliteDirectory,
            description: "Directory containing loki.sqlite",
        }),
    },
    handler: startServer,
});

if (process.env.LOKI_SMOKE_TEST === "1") {
    runSmokeTest();
} else {
    run(cli, process.argv.slice(2)).catch((error: unknown) => {
        console.error(error);
        process.exitCode = 1;
    });
}
