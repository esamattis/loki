import { execFile as execFileCallback } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { promisify } from "node:util";
import { expect, test } from "./fixtures";
import { logOut } from "./helpers";

const execFile = promisify(execFileCallback);
const require = createRequire(import.meta.url);

function wranglerBin(): string {
    const packageJson = require.resolve("wrangler/package.json");
    return path.join(path.dirname(packageJson), "bin", "wrangler.js");
}

async function executePlaywrightDb(sql: string): Promise<void> {
    await execFile(process.execPath, [
        wranglerBin(),
        "d1",
        "execute",
        "DB",
        "--local",
        "--persist-to",
        ".playwright/state",
        "--command",
        sql,
    ]);
}

async function tryDemo(page: import("./fixtures").Page) {
    await page.goto("/");
    await page.getByRole("button", { name: "Try demo" }).first().click();
    await expect(page).toHaveURL("/logbook");
}

test("try demo logs in with example data and blocks writes", async ({
    page,
}) => {
    await tryDemo(page);
    await expect(
        page.getByRole("heading", { name: "622 Jumps" }),
    ).toBeVisible();
    await expect(
        page.getByRole("link", {
            name: /#622\b.*Wingsuit.*Skydive Chicago.*Twin Otter/,
        }),
    ).toBeVisible();

    await page
        .getByRole("link", {
            name: /#622\b.*Wingsuit.*Skydive Chicago.*Twin Otter/,
        })
        .click();
    await expect(page).toHaveURL(/\/logbook\/jumps\/[^/]+$/);
    await page.getByRole("button", { name: "Save jump" }).click();
    await expect(page).toHaveURL("/readonly");
    await expect(
        page.getByRole("heading", { name: "Read-only account" }),
    ).toBeVisible();
    await expect(
        page.getByText("This account is read-only", { exact: false }),
    ).toBeVisible();
    await expect(
        page.getByRole("link", { name: "Create account" }),
    ).toHaveCount(0);
    await expect(
        page.getByRole("link", { name: "Back to logbook" }),
    ).toHaveCount(0);

    await page.locator("main").getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL("/login");
});

test("adding a jump as demo redirects to the read-only page", async ({
    page,
}) => {
    await tryDemo(page);

    await page.goto("/logbook/jumps/new");
    await page.locator('input[name="jumpNumber"]').fill("9999");
    await page.getByRole("button", { name: "Add jump" }).click();
    await expect(page).toHaveURL("/readonly");
    await expect(
        page.getByRole("heading", { name: "Read-only account" }),
    ).toBeVisible();
});

test("try demo skips re-import when example data checksum matches", async ({
    page,
}) => {
    await tryDemo(page);
    await expect(
        page.getByRole("heading", { name: "622 Jumps" }),
    ).toBeVisible();
    await logOut(page);

    // Mutate demo data while the stored CSV checksum still matches.
    // Bump the HTML cache generation so the UI reflects the DB change.
    await executePlaywrightDb(`
        UPDATE jumps
        SET description = 'checksum-skip-marker'
        WHERE jump_number = 622
          AND user_uuid = (SELECT uuid FROM users WHERE username = 'demo');
        UPDATE users
        SET html_cache_generation = html_cache_generation + 1
        WHERE username = 'demo';
    `);

    await tryDemo(page);
    await page
        .getByRole("link", {
            name: /#622\b.*Wingsuit.*Skydive Chicago.*Twin Otter/,
        })
        .click();
    await expect(page.getByText("checksum-skip-marker")).toBeVisible();
    await expect(
        page.getByText("Long flock at sunset. Clean flight, clean open"),
    ).toHaveCount(0);
});

test("try demo re-imports when example data checksum changes", async ({
    page,
}) => {
    await tryDemo(page);
    await expect(
        page.getByRole("heading", { name: "622 Jumps" }),
    ).toBeVisible();
    await logOut(page);

    await executePlaywrightDb(`
        UPDATE jumps
        SET description = 'should-be-replaced-on-reimport'
        WHERE jump_number = 622
          AND user_uuid = (SELECT uuid FROM users WHERE username = 'demo');
        UPDATE users
        SET options = json_set(options, '$.exampleDataChecksum', 'stale-checksum')
        WHERE username = 'demo';
    `);

    await tryDemo(page);
    await page
        .getByRole("link", {
            name: /#622\b.*Wingsuit.*Skydive Chicago.*Twin Otter/,
        })
        .click();
    await expect(
        page.getByText("Long flock at sunset. Clean flight, clean open"),
    ).toBeVisible();
    await expect(page.getByText("should-be-replaced-on-reimport")).toHaveCount(
        0,
    );
});
