import { readMigrationFiles } from "drizzle-orm/migrator";
import { join, relative, resolve, sep } from "node:path";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { $ } from "zx";
import { appConfig } from "../../src/app/config.ts";

const root = resolve(import.meta.dirname, "../..");
const outputDirectory = join(root, "dist-executable");
const executableName = appConfig.executableName;
const executablePath = join(outputDirectory, executableName);
const $$ = $({
    cwd: root,
    env: { ...process.env, NODE_ENV: "production" },
    stdio: "inherit",
    verbose: false,
});

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

function migrationAssets(): Record<string, string> {
    const drizzleDirectory = join(root, "drizzle");
    const assets: Record<string, string> = {};
    for (const migration of readMigrationFiles({
        migrationsFolder: drizzleDirectory,
    })) {
        assets[`drizzle/${migration.name}/migration.sql`] = join(
            drizzleDirectory,
            migration.name,
            "migration.sql",
        );
    }
    return assets;
}

async function main(): Promise<void> {
    rmSync(outputDirectory, { recursive: true, force: true });
    mkdirSync(outputDirectory, { recursive: true });

    const assets = migrationAssets();
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

    await $$`node --build-sea ${configPath.split(sep).join("/")}`;
    if (process.platform === "darwin") {
        await $$`codesign --sign - ${executablePath}`;
    }
    const smokeTestPath = `./${relative(root, executablePath).split(sep).join("/")}`;
    const $smokeTest = $$({
        env: { ...process.env, APP_EXECUTABLE_SMOKE_TEST: "1" },
    });
    await $smokeTest`${smokeTestPath}`;
    console.log(`Executable built: ${executablePath}`);
}

await main();
