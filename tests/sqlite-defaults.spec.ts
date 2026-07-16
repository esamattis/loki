import { expect, test } from "@playwright/test";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, win32 } from "node:path";
import { createSqliteDatabase, defaultSqliteDirectory } from "../src/db-sqlite";

test("uses .local/share on Linux and macOS", () => {
    for (const platform of ["linux", "darwin"] as const) {
        expect(defaultSqliteDirectory(platform, {}, "/home/example")).toBe(
            "/home/example/.local/share/loki/sqlite",
        );
    }
});

test("uses Windows local application data", () => {
    expect(
        defaultSqliteDirectory(
            "win32",
            { LOCALAPPDATA: String.raw`C:\Users\Example\AppData\Local` },
            String.raw`C:\Users\Example`,
        ),
    ).toBe(String.raw`C:\Users\Example\AppData\Local\Loki\sqlite`);
    expect(
        defaultSqliteDirectory("win32", {}, String.raw`C:\Users\Example`),
    ).toBe(
        win32.join(
            String.raw`C:\Users\Example`,
            "AppData",
            "Local",
            "Loki",
            "sqlite",
        ),
    );
});

test("restricts newly created SQLite storage on POSIX", () => {
    test.skip(process.platform === "win32");
    const root = mkdtempSync(join(tmpdir(), "loki-sqlite-defaults-"));
    const directory = join(root, "data");
    const path = join(directory, "loki.sqlite");

    try {
        const { sqlite } = createSqliteDatabase(path);
        sqlite.close();

        expect(statSync(directory).mode & 0o777).toBe(0o700);
        expect(statSync(path).mode & 0o777).toBe(0o600);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
