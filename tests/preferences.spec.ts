import { expect, test, type Page } from "@playwright/test";
import { execFile as execFileCallback } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const execFile = promisify(execFileCallback);
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function wranglerBin(): string {
    const packageJson = require.resolve("wrangler/package.json");
    return path.join(path.dirname(packageJson), "bin", "wrangler.js");
}

type D1ExecuteResult = {
    results: Array<Record<string, number | string | null>>;
};

async function queryPlaywrightDb(
    sql: string,
): Promise<Array<Record<string, number | string | null>>> {
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
    const parsed: D1ExecuteResult[] = JSON.parse(stdout);
    return parsed[0]?.results ?? [];
}

async function openManageLogbook(page: Page) {
    await page.getByRole("button", { name: "Manage logbook" }).click();
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

async function addItem(
    page: Page,
    manageLink: string,
    addLabel: string,
    name: string,
) {
    await openManageLogbook(page);
    await page.getByRole("link", { name: manageLink }).click();
    await page.getByRole("link", { name: addLabel }).click();
    await page.locator('input[name="name"]').fill(name);
    await page.getByRole("button", { name: addLabel }).click();
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

    await page.getByRole("button", { name: "Log out" }).click();
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

    await addItem(page, "Manage locations", "Add location", "Doomed DZ");
    await page.getByRole("link", { name: `${displayName}'s logbook` }).click();
    await addItem(page, "Manage aircraft", "Add aircraft", "Doomed Plane");
    await page.getByRole("link", { name: `${displayName}'s logbook` }).click();
    await addItem(page, "Manage gear", "Add gear", "Doomed Canopy");
    await page.getByRole("link", { name: `${displayName}'s logbook` }).click();
    await addItem(page, "Manage jump types", "Add jump type", "Doomed Type");
    await page.getByRole("link", { name: `${displayName}'s logbook` }).click();

    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await page.locator('input[name="openaiApiKey"]').fill("sk-test-key");
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page).toHaveURL("/logbook");

    await page.getByRole("link", { name: "From image", exact: true }).click();
    await page
        .locator('input[name="image"]')
        .setInputFiles(path.join(__dirname, "fixtures/jump-image.png"));
    await page.getByRole("button", { name: "Read image" }).click();
    await expect(page).toHaveURL(/\/logbook\/jumps\/new\?/);

    await page.getByRole("link", { name: `${displayName}'s logbook` }).click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await page.locator('select[name="locationUuid"]').selectOption({
        label: "Doomed DZ",
    });
    await page.locator('select[name="aircraftUuid"]').selectOption({
        label: "Doomed Plane",
    });
    await page.getByRole("checkbox", { name: "Doomed Canopy" }).check();
    await page.getByRole("checkbox", { name: "Doomed Type" }).check();
    await page.locator('textarea[name="description"]').fill("Doomed jump");
    await page.getByRole("button", { name: "Add jump" }).click();
    await expect(page).toHaveURL("/logbook");
    await expect(page.getByRole("link", { name: /#1/ })).toBeVisible();

    const userUuid = String(
        (
            await queryPlaywrightDb(
                `SELECT uuid FROM users WHERE username = '${username}'`,
            )
        )[0]?.uuid,
    );
    const usageCountBefore = Number(
        (
            await queryPlaywrightDb(
                `SELECT count(*) AS c FROM ai_usage WHERE user_uuid = '${userUuid}'`,
            )
        )[0]?.c,
    );
    expect(usageCountBefore).toBeGreaterThan(0);
    const totalUsageBefore = Number(
        (await queryPlaywrightDb("SELECT count(*) AS c FROM ai_usage"))[0]?.c,
    );

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

    const totalUsageAfter = Number(
        (await queryPlaywrightDb("SELECT count(*) AS c FROM ai_usage"))[0]?.c,
    );
    expect(totalUsageAfter).toBe(totalUsageBefore);

    const scrubbedUsage = (
        await queryPlaywrightDb(
            "SELECT count(*) AS c FROM ai_usage WHERE user_uuid IS NULL AND title = 'Deleted account'",
        )
    )[0];
    expect(Number(scrubbedUsage?.c)).toBeGreaterThanOrEqual(usageCountBefore);

    const linkedToDeletedUser = Number(
        (
            await queryPlaywrightDb(
                `SELECT count(*) AS c FROM ai_usage WHERE user_uuid = '${userUuid}'`,
            )
        )[0]?.c,
    );
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
