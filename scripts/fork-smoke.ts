import {
    copyFileSync,
    cpSync,
    existsSync,
    mkdtempSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    readlinkSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { $ } from "zx";

const repositoryRoot = resolve(import.meta.dirname, "..");
const temporaryRoot = mkdtempSync(join(tmpdir(), "core-fork-smoke-"));
const forkRoot = join(temporaryRoot, "acorn-notes");
const $$ = $({
    cwd: forkRoot,
    env: { ...process.env, APP_REVISION: "fork-smoke" },
    stdio: "inherit",
});

const excludedRootEntries = new Set([
    ".git",
    ".playwright",
    ".wrangler",
    "dist",
    "dist-executable",
    "dist-server",
    "drizzle",
    "node_modules",
    "playwright-report",
    "public",
    "src/app",
    "test-results",
]);

function shouldCopy(source: string): boolean {
    const relative = source.slice(repositoryRoot.length + 1);
    if (!relative) return true;
    for (const entry of excludedRootEntries) {
        if (relative === entry || relative.startsWith(`${entry}/`))
            return false;
    }
    return true;
}

function copyFixtureDirectory(source: string, destination: string): void {
    cpSync(source, destination, {
        recursive: true,
        filter(path) {
            if (path === source) return true;
            return path.endsWith(".fixture");
        },
    });
    const pending = [destination];
    while (pending.length > 0) {
        const directory = pending.pop();
        if (!directory) continue;
        for (const name of readFileNames(directory)) {
            const path = join(directory, name);
            if (!name.endsWith(".fixture")) continue;
            const target = path.slice(0, -".fixture".length);
            copyFileSync(path, target);
            rmSync(path);
        }
    }
}

function readFileNames(directory: string): string[] {
    return readdirSync(directory);
}

function prepareFork(): void {
    cpSync(repositoryRoot, forkRoot, {
        recursive: true,
        filter: shouldCopy,
    });
    const nodeModules = join(repositoryRoot, "node_modules");
    symlinkSync(
        existsSync(nodeModules) && readlinkSafe(nodeModules)
            ? resolve(dirname(nodeModules), readlinkSync(nodeModules))
            : nodeModules,
        join(forkRoot, "node_modules"),
        "dir",
    );
    mkdirSync(join(forkRoot, "src/app"), { recursive: true });
    mkdirSync(join(forkRoot, "public"), { recursive: true });
    copyFixtureDirectory(
        join(repositoryRoot, "tests/fixtures/fork-app"),
        join(forkRoot, "src/app"),
    );
    copyFixtureDirectory(
        join(repositoryRoot, "tests/fixtures/fork-public"),
        join(forkRoot, "public"),
    );
    const packageJsonPath = join(forkRoot, "package.json");
    const packageJson = readFileSync(packageJsonPath, "utf8").replace(
        /"name":\s*"[^"]+"/,
        '"name": "acorn-notes"',
    );
    writeFileSync(packageJsonPath, packageJson);
}

function readlinkSafe(path: string): boolean {
    try {
        readlinkSync(path);
        return true;
    } catch {
        return false;
    }
}

async function waitForServer(url: string): Promise<void> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 100; attempt += 1) {
        try {
            const response = await fetch(url);
            if (response.ok) return;
        } catch (error) {
            lastError = error;
        }
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
    }
    throw new Error(`Fork executable did not start: ${String(lastError)}`);
}

function assertIncludes(value: string, expected: string): void {
    if (!value.includes(expected))
        throw new Error(
            `Expected response to include ${JSON.stringify(expected)}`,
        );
}

function assertLocation(response: Response, expected: string): void {
    const location = response.headers.get("location");
    if (location !== expected)
        throw new Error(
            `Expected redirect to ${expected}, received ${String(location)}`,
        );
}

function assertNoLokiSurface(value: string): void {
    const withoutStableProtocols = value
        .replaceAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replaceAll(/data-loki-[a-z-]+/gi, "")
        .replaceAll(/__loki_[a-z_]+/gi, "")
        .replaceAll(/loki-[a-z-]+/gi, "");
    const match =
        /loki|logbook|skydiv|parachute|github\.com\/esamattis\/loki/i.exec(
            withoutStableProtocols,
        );
    if (match)
        throw new Error(
            `Replacement application exposed Loki product surface: ${withoutStableProtocols.slice(Math.max(0, match.index - 80), match.index + 120)}`,
        );
}

async function exerciseAccountLifecycle(baseUrl: string): Promise<void> {
    let cookie = "";
    async function request(
        path: string,
        init: RequestInit = {},
    ): Promise<Response> {
        const headers = new Headers(init.headers);
        if (cookie) headers.set("cookie", cookie);
        const response = await fetch(`${baseUrl}${path}`, {
            ...init,
            headers,
            redirect: "manual",
        });
        const setCookie = response.headers.get("set-cookie");
        if (setCookie) cookie = setCookie.split(";", 1)[0] ?? cookie;
        return response;
    }
    function form(values: Record<string, string>): RequestInit {
        return {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(values),
        };
    }

    let response = await request(
        "/register",
        form({
            username: "fork-user",
            displayName: "Fork User",
            email: "fork-user@example.test",
            password: "correct-horse",
            confirmPassword: "correct-horse",
            dateTimeFormat: "iso",
            numberFormat: "comma-period",
        }),
    );
    assertLocation(response, "/dashboard");

    const home = await request("/welcome");
    const homeHtml = await home.text();
    if (!home.ok)
        throw new Error(
            `Public route failed (${String(home.status)}): ${homeHtml.slice(0, 500)}`,
        );
    assertIncludes(homeHtml, "Acorn Notes");
    assertNoLokiSurface(homeHtml);

    response = await request("/dashboard");
    const dashboardHtml = await response.text();
    assertIncludes(dashboardHtml, "Private Acorn workspace");
    assertNoLokiSurface(dashboardHtml);

    response = await request("/privacy");
    const privacyHtml = await response.text();
    assertIncludes(privacyHtml, "Acorn Notes privacy policy");
    assertNoLokiSurface(privacyHtml);

    response = await request(
        "/preferences",
        form({
            username: "fork-user",
            displayName: "Updated Fork User",
            email: "fork-user@example.test",
            password: "",
            confirmPassword: "",
            dateTimeFormat: "american",
            numberFormat: "period-comma",
        }),
    );
    assertLocation(response, "/dashboard");

    response = await request("/logout", { method: "POST" });
    assertLocation(response, "/login");
    response = await request(
        "/login",
        form({
            usernameOrEmail: "fork-user",
            password: "correct-horse",
        }),
    );
    assertLocation(response, "/dashboard");

    response = await request("/logbook");
    if (response.status !== 404)
        throw new Error(
            `Inherited Loki route returned ${String(response.status)}`,
        );
    await response.body?.cancel();

    response = await request("/preferences", form({ action: "delete" }));
    assertLocation(response, "/login");
    response = await request("/dashboard");
    assertLocation(response, "/register");
}

async function main(): Promise<void> {
    prepareFork();
    await $$`node scripts/db-generate.ts`;
    if (!existsSync(join(forkRoot, "drizzle")))
        throw new Error("Fresh migration baseline did not create drizzle/");
    await $$`pnpm exec vite build`;
    await $$`pnpm exec vite build --config vite.node.config.ts`;
    await $$`pnpm run build:executable`;

    const sqliteDirectory = join(forkRoot, ".fork-smoke/sqlite");
    mkdirSync(sqliteDirectory, { recursive: true });
    const executable = join(
        forkRoot,
        "dist-executable",
        process.platform === "win32" ? "acorn-notes.exe" : "acorn-notes",
    );
    const server = $$({
        stdio: "pipe",
    })`${executable} --no-open --host 127.0.0.1 --port 8797 --sqlite-dir ${sqliteDirectory}`;
    try {
        await waitForServer("http://127.0.0.1:8797/");
        await exerciseAccountLifecycle("http://127.0.0.1:8797");
    } finally {
        server.kill("SIGTERM");
        await server.catch(() => undefined);
    }
    const databasePath = join(sqliteDirectory, "acorn-notes.sqlite");
    if (!existsSync(databasePath))
        throw new Error(`Fork database missing at ${databasePath}`);
    if (existsSync(join(sqliteDirectory, "loki.sqlite")))
        throw new Error("Fork used Loki's SQLite filename");
    console.log(`Fork smoke test passed in ${basename(forkRoot)}`);
}

try {
    await main();
} finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
}
