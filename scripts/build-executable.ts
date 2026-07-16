import { createRequire } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";
import {
    mkdirSync,
    readFileSync,
    readdirSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { $ } from "zx";

const root = resolve(import.meta.dirname, "..");
const outputDirectory = join(root, "dist-executable");
const executableName = process.platform === "win32" ? "loki.exe" : "loki";
const executablePath = join(outputDirectory, executableName);

function listFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? listFiles(path) : [path];
    });
}

function assetKey(prefix: string, base: string, path: string): string {
    return `${prefix}/${relative(base, path).split(sep).join("/")}`;
}

function addDirectoryAssets(
    assets: Record<string, string>,
    prefix: string,
    directory: string,
): void {
    for (const path of listFiles(directory)) {
        assets[assetKey(prefix, directory, path)] = path;
    }
}

function betterSqliteAddonPath(): string {
    const require = createRequire(import.meta.url);
    const packagePath = require.resolve("better-sqlite3/package.json");
    return join(dirname(packagePath), "build/Release/better_sqlite3.node");
}

function migrationAssets(): Record<string, string> {
    const drizzleDirectory = join(root, "drizzle");
    const journalPath = join(drizzleDirectory, "meta/_journal.json");
    const journal: unknown = JSON.parse(readFileSync(journalPath, "utf8"));
    if (
        !journal ||
        typeof journal !== "object" ||
        !("entries" in journal) ||
        !Array.isArray(journal.entries)
    ) {
        throw new Error("Invalid Drizzle migration journal");
    }

    const assets: Record<string, string> = {
        "drizzle/meta/_journal.json": journalPath,
    };
    for (const entry of journal.entries) {
        if (
            !entry ||
            typeof entry !== "object" ||
            !("tag" in entry) ||
            typeof entry.tag !== "string"
        ) {
            throw new Error("Invalid Drizzle migration journal entry");
        }
        assets[`drizzle/${entry.tag}.sql`] = join(
            drizzleDirectory,
            `${entry.tag}.sql`,
        );
    }
    return assets;
}

async function run(command: string, args: string[]): Promise<void> {
    await $({ cwd: root, stdio: "inherit" })`${command} ${args}`;
}

async function main(): Promise<void> {
    rmSync(outputDirectory, { recursive: true, force: true });
    mkdirSync(outputDirectory, { recursive: true });

    const assets = migrationAssets();
    assets["native/better_sqlite3.node"] = betterSqliteAddonPath();
    addDirectoryAssets(assets, "client", join(root, "dist/client"));

    const configPath = join(outputDirectory, "sea-config.json");
    writeFileSync(
        configPath,
        `${JSON.stringify(
            {
                main: join(root, "dist-server/node.js"),
                mainFormat: "module",
                output: executablePath,
                disableExperimentalSEAWarning: true,
                useCodeCache: false,
                assets,
            },
            null,
            2,
        )}\n`,
    );

    await run("node", ["--build-sea", configPath]);
    if (process.platform === "darwin") {
        await run("codesign", ["--sign", "-", executablePath]);
    }
    console.log(`Executable built: ${executablePath}`);
}

await main();
