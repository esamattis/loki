import { expect, test, type Page } from "@playwright/test";
import { execFile as execFileCallback } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { logOut, openMainMenu, openManageLogbook } from "./helpers";

const execFile = promisify(execFileCallback);
const require = createRequire(import.meta.url);

function wranglerBin(): string {
    const packageJson = require.resolve("wrangler/package.json");
    return path.join(path.dirname(packageJson), "bin", "wrangler.js");
}

type D1ExecuteResult = {
    results: Array<Record<string, number | string | null>>;
};

async function executePlaywrightDb(sql: string): Promise<D1ExecuteResult[]> {
    const { stdout } = await execFile(process.execPath, [
        wranglerBin(),
        "d1",
        "execute",
        "DB",
        "--local",
        "--persist-to",
        ".playwright/state",
        "--json",
        "--command",
        sql,
    ]);
    return JSON.parse(stdout);
}

async function queryPlaywrightDb(
    sql: string,
): Promise<Array<Record<string, number | string | null>>> {
    return (await executePlaywrightDb(sql))[0]?.results ?? [];
}

async function registerUser(page: Page, username: string, displayName: string) {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="displayName"]').fill(displayName);
    await page.locator('input[name="email"]').fill(`${username}@example.test`);
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/logbook");
}

async function seedAccountData(username: string): Promise<string> {
    const results = await executePlaywrightDb(`
        INSERT INTO locations (uuid, user_uuid, name, previous_jump_count, archived)
        SELECT 'doomed-location', uuid, 'Doomed DZ', 0, 0
        FROM users WHERE username = '${username}';
        INSERT INTO aircrafts (uuid, user_uuid, name, previous_jump_count, archived)
        SELECT 'doomed-aircraft', uuid, 'Doomed Plane', 0, 0
        FROM users WHERE username = '${username}';
        INSERT INTO gear (uuid, user_uuid, name, previous_usage_count, archived)
        SELECT 'doomed-gear', uuid, 'Doomed Canopy', 0, 0
        FROM users WHERE username = '${username}';
        INSERT INTO jump_types (uuid, user_uuid, name, previous_usage_count, archived)
        SELECT 'doomed-jump-type', uuid, 'Doomed Type', 0, 0
        FROM users WHERE username = '${username}';
        INSERT INTO jumps (
            uuid, user_uuid, location_uuid, aircraft_uuid, jump_number, jump_date,
            exit_altitude, opening_altitude, freefall_time, description
        ) VALUES (
            'doomed-jump', (SELECT uuid FROM users WHERE username = '${username}'),
            'doomed-location', 'doomed-aircraft', 1,
            '2026-01-01', 4000, 1000, 55, 'Doomed jump'
        );
        INSERT INTO jumps_to_gear (jump_uuid, gear_uuid)
        VALUES ('doomed-jump', 'doomed-gear');
        INSERT INTO jumps_to_jump_types (jump_uuid, jump_type_uuid)
        VALUES ('doomed-jump', 'doomed-jump-type');
        INSERT INTO ai_usage (
            uuid, user_uuid, model, title, created_at, input_tokens, output_tokens,
            total_tokens
        ) VALUES (
            'doomed-ai-usage',
            (SELECT uuid FROM users WHERE username = '${username}'),
            'gpt-4.1-mini', 'Doomed image read', 0, 1, 1, 2
        );
        SELECT uuid FROM users WHERE username = '${username}';
    `);
    const user = results.at(-1)?.results[0];
    return String(user?.uuid);
}

function deleteAccountButton(page: Page) {
    return page
        .locator("form")
        .filter({
            has: page.locator('input[name="action"][value="delete"]'),
        })
        .getByRole("button");
}

test("a skydiver can update preferences and account details", async ({
    page,
}) => {
    await registerUser(page, "preferences-skydiver", "Preferences Skydiver");

    await openMainMenu(page);
    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await expect(page).toHaveURL("/preferences");
    await page.locator('input[name="displayName"]').fill("Feet Skydiver");
    await page.locator('input[name="email"]').fill("feet@example.test");
    await page.locator('select[name="altitudeUnits"]').selectOption("feet");
    await page
        .locator('select[name="speedUnits"]')
        .selectOption("meters-per-second");
    await page.locator('input[name="password"]').fill("new-parachute");
    await page.locator('input[name="confirmPassword"]').fill("new-parachute");
    await page.getByRole("button", { name: "Save preferences" }).click();

    await expect(page).toHaveURL("/logbook");
    await expect(
        page.getByRole("link", { name: /Feet Skydiver's logbook/ }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await expect(page.getByText("Exit altitude (ft)")).toBeVisible();
    await expect(page.getByText("Opening altitude (ft)")).toBeVisible();

    await openMainMenu(page);
    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await expect(page.locator('input[name="displayName"]')).toHaveValue(
        "Feet Skydiver",
    );
    await expect(page.locator('input[name="email"]')).toHaveValue(
        "feet@example.test",
    );
    await expect(page.locator('select[name="altitudeUnits"]')).toHaveValue(
        "feet",
    );
    await expect(page.locator('select[name="speedUnits"]')).toHaveValue(
        "meters-per-second",
    );

    await logOut(page);
    await expect(page).toHaveURL("/login");
    await page
        .locator('input[name="usernameOrEmail"]')
        .fill("feet@example.test");
    await page.locator('input[name="password"]').fill("new-parachute");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/logbook");
});

// eslint-disable-next-line max-lines-per-function
test("a skydiver can permanently delete their account and all jump items", async ({
    page,
}) => {
    const username = "delete-account-skydiver";
    const displayName = "Delete Account Skydiver";
    await registerUser(page, username, displayName);

    const userUuid = await seedAccountData(username);

    await openMainMenu(page);
    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await expect(page).toHaveURL("/preferences");
    await expect(page.getByText("Danger zone")).toBeVisible();

    const button = deleteAccountButton(page);
    await expect(button).toHaveText("Delete account");
    await button.click();
    await expect(button).toHaveText("Confirm delete", { timeout: 1000 });
    await button.click();

    await expect(page).toHaveURL("/login");
    await page.locator('input[name="usernameOrEmail"]').fill(username);
    await page.locator('input[name="password"]').fill("parachute");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/login");
    await expect(page.getByText("Invalid username or password")).toBeVisible();

    const usageAfter = (
        await queryPlaywrightDb(`
            SELECT
                (SELECT count(*) FROM ai_usage) AS total_count,
                (
                    SELECT count(*) FROM ai_usage
                    WHERE user_uuid IS NULL AND title = 'Deleted account'
                ) AS scrubbed_count,
                (
                    SELECT count(*) FROM ai_usage WHERE user_uuid = '${userUuid}'
                ) AS linked_count;
        `)
    )[0];
    const totalUsageAfter = Number(usageAfter?.total_count);
    expect(totalUsageAfter).toBeGreaterThan(0);

    expect(Number(usageAfter?.scrubbed_count)).toBeGreaterThanOrEqual(1);

    const linkedToDeletedUser = Number(usageAfter?.linked_count);
    expect(linkedToDeletedUser).toBe(0);

    // Username is free again; a new account must not inherit deleted jump items.
    await registerUser(page, username, displayName);
    await expect(page.getByRole("link", { name: /#1/ })).toHaveCount(0);
    await expect(page.getByText("Doomed jump")).toHaveCount(0);

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await expect(page.getByText("Doomed DZ", { exact: true })).toHaveCount(0);
    await expect(page.getByText("No locations yet.")).toBeVisible();

    await page.getByRole("link", { name: `${displayName}'s logbook` }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await expect(page.getByText("Doomed Plane", { exact: true })).toHaveCount(
        0,
    );
    await expect(page.getByText("No aircraft yet.")).toBeVisible();

    await page.getByRole("link", { name: `${displayName}'s logbook` }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await expect(page.getByText("Doomed Canopy", { exact: true })).toHaveCount(
        0,
    );
    await expect(page.getByText("No gear yet.")).toBeVisible();

    await page.getByRole("link", { name: `${displayName}'s logbook` }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage jump types" }).click();
    await expect(page.getByText("Doomed Type", { exact: true })).toHaveCount(0);

    await page.getByRole("link", { name: `${displayName}'s logbook` }).click();
    await page.getByRole("link", { name: "From image", exact: true }).click();
    await expect(page.getByText("No image reads yet.")).toBeVisible();
});
