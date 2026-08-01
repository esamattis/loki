import {
    existsSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
} from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { expect, test } from "./fixtures";
import localConfig from "../../drizzle.config";
import {
    drizzleOutputPath,
    drizzleSchemaPath,
} from "../../drizzle.shared.config";
import { listSqlFiles } from "../../scripts/db-generate";

test("local and remote Drizzle configurations use the importable app schema", async () => {
    const previousAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const previousToken = process.env.CLOUDFLARE_API_TOKEN;
    process.env.CLOUDFLARE_ACCOUNT_ID = "test-account";
    process.env.CLOUDFLARE_API_TOKEN = "test-token";
    const remoteConfig = (await import("../../drizzle.remote.config")).default;
    if (previousAccountId === undefined)
        delete process.env.CLOUDFLARE_ACCOUNT_ID;
    else process.env.CLOUDFLARE_ACCOUNT_ID = previousAccountId;
    if (previousToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = previousToken;

    expect(localConfig.schema).toBe(drizzleSchemaPath);
    expect(remoteConfig.schema).toBe(drizzleSchemaPath);
    expect(localConfig.out).toBe(drizzleOutputPath);
    expect(remoteConfig.out).toBe(drizzleOutputPath);
    expect(existsSync(resolve(drizzleSchemaPath))).toBe(true);
    await expect(import("../../src/app/schema")).resolves.toBeTruthy();
});

test("source and configuration files contain no deleted extraction paths", () => {
    const deletedSchemaPath = ["src", "schema.ts"].join("/");
    const deletedExamplePath = ["src", "example-logbook.csv"].join("/");
    const ignoredDirectories = new Set([
        ".git",
        ".wrangler",
        "backups",
        "dist",
        "dist-server",
        "node_modules",
        "playwright-report",
        "test-results",
    ]);
    const textExtensions = new Set([
        ".css",
        ".html",
        ".json",
        ".jsonc",
        ".md",
        ".sh",
        ".ts",
        ".tsx",
        ".yaml",
        ".yml",
    ]);
    const root = resolve(".");

    function sourceFiles(directory: string): string[] {
        return readdirSync(directory, { withFileTypes: true }).flatMap(
            (entry) => {
                const path = join(directory, entry.name);
                if (entry.isDirectory())
                    return ignoredDirectories.has(entry.name)
                        ? []
                        : sourceFiles(path);
                return textExtensions.has(extname(entry.name)) ? [path] : [];
            },
        );
    }

    for (const file of sourceFiles(root)) {
        if (relative(root, file) === "docs/core-extraction-plan.md") continue;
        const contents = readFileSync(file, "utf8");
        expect(contents, file).not.toContain(deletedSchemaPath);
        expect(contents, file).not.toContain(deletedExamplePath);
    }
});

test("database generation initializes missing or empty migration state", () => {
    const directory = mkdtempSync(join(tmpdir(), "loki-db-generate-"));
    const missingDirectory = join(directory, "drizzle");
    try {
        expect(existsSync(missingDirectory)).toBe(false);
        expect(listSqlFiles(missingDirectory)).toEqual([]);
        expect(existsSync(missingDirectory)).toBe(true);
        expect(listSqlFiles(missingDirectory)).toEqual([]);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});
