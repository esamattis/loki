import {
    cpSync,
    existsSync,
    mkdtempSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    readlinkSync,
    renameSync,
    rmSync,
    statSync,
    symlinkSync,
    writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
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
            return statSync(path).isDirectory() || path.endsWith(".fixture");
        },
    });
    const pending = [destination];
    while (pending.length > 0) {
        const directory = pending.pop();
        if (!directory) continue;
        for (const name of readdirSync(directory)) {
            const path = join(directory, name);
            if (statSync(path).isDirectory()) {
                pending.push(path);
                continue;
            }
            if (!name.endsWith(".fixture")) continue;
            const target = path.slice(0, -".fixture".length);
            renameSync(path, target);
        }
    }
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

async function allocatePort(): Promise<number> {
    const portServer = createServer();
    await new Promise<void>((resolvePromise, reject) => {
        portServer.once("error", reject);
        portServer.listen(0, "127.0.0.1", resolvePromise);
    });
    const address = portServer.address();
    await new Promise<void>((resolvePromise, reject) => {
        portServer.close((error) => {
            if (error) reject(error);
            else resolvePromise();
        });
    });
    if (!address || typeof address === "string")
        throw new Error("Failed to allocate a fork executable port");
    return address.port;
}

async function waitForServer(
    url: string,
    processOutput: () => string,
): Promise<void> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 100; attempt += 1) {
        try {
            const response = await fetch(url);
            if (response.ok) return;
            lastError = new Error(
                `Fork executable returned ${String(response.status)}`,
            );
            await response.body?.cancel();
        } catch (error) {
            lastError = error;
        }
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
    }
    throw new Error(
        `Fork executable did not start: ${String(lastError)}\n\nCaptured process output:\n${processOutput() || "(no output captured)"}`,
    );
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
    assertIncludes(dashboardHtml, 'aria-label="Note actions"');
    assertIncludes(dashboardHtml, 'aria-label="Menu"');
    assertIncludes(dashboardHtml, "Preferences");
    assertNoLokiSurface(dashboardHtml);

    response = await request("/privacy");
    const privacyHtml = await response.text();
    assertIncludes(privacyHtml, "Acorn Notes privacy policy");
    assertNoLokiSurface(privacyHtml);

    response = await request("/nested/copy-proof.txt");
    const nestedFixture = await response.text();
    if (!response.ok)
        throw new Error(
            `Nested public fixture failed (${String(response.status)}): ${nestedFixture.slice(0, 500)}`,
        );
    assertIncludes(nestedFixture, "nested fixture copied");

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
    const port = await allocatePort();
    const baseUrl = `http://127.0.0.1:${String(port)}`;
    const server = $$({
        stdio: ["ignore", "pipe", "pipe"],
    })`${executable} --no-open --host 127.0.0.1 --port ${port} --sqlite-dir ${sqliteDirectory}`;
    let stdout = "";
    let stderr = "";
    server.stdout.on("data", (chunk) => {
        stdout += String(chunk);
    });
    server.stderr.on("data", (chunk) => {
        stderr += String(chunk);
    });
    try {
        await waitForServer(`${baseUrl}/`, () =>
            [`stdout:\n${stdout}`, `stderr:\n${stderr}`].join("\n"),
        );
        await exerciseAccountLifecycle(baseUrl);
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
