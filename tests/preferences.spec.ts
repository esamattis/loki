import { acceptPrivacyPolicyIfRequired } from "./helpers";
import { expect, test, type Page } from "./fixtures";
import {
    executePlaywrightDb,
    logOut,
    openDangerZone,
    openMainMenu,
    openManageLogbook,
    queryPlaywrightDb,
} from "./helpers";

async function registerUser(page: Page, username: string, displayName: string) {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="displayName"]').fill(displayName);
    await page.locator('input[name="email"]').fill(`${username}@example.test`);
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await acceptPrivacyPolicyIfRequired(page);
    await expect(page).toHaveURL("/logbook");
}

async function seedAccountData(username: string): Promise<string> {
    const locationUuid = `${username}-location`;
    const aircraftUuid = `${username}-aircraft`;
    const gearUuid = `${username}-gear`;
    const jumpTypeUuid = `${username}-jump-type`;
    const jumpUuid = `${username}-jump`;
    const usageUuid = `${username}-ai-usage`;
    const results = await executePlaywrightDb(`
        INSERT INTO locations (uuid, user_uuid, name, previous_jump_count, archived)
        SELECT '${locationUuid}', uuid, 'Doomed DZ', 0, 0
        FROM users WHERE username = '${username}';
        INSERT INTO aircrafts (uuid, user_uuid, name, previous_jump_count, archived)
        SELECT '${aircraftUuid}', uuid, 'Doomed Plane', 0, 0
        FROM users WHERE username = '${username}';
        INSERT INTO gear (uuid, user_uuid, name, previous_usage_count, archived)
        SELECT '${gearUuid}', uuid, 'Doomed Canopy', 0, 0
        FROM users WHERE username = '${username}';
        INSERT INTO jump_types (uuid, user_uuid, name, previous_usage_count, archived)
        SELECT '${jumpTypeUuid}', uuid, 'Doomed Type', 0, 0
        FROM users WHERE username = '${username}';
        INSERT INTO jumps (
            uuid, user_uuid, location_uuid, jump_number, jump_date,
            exit_altitude, opening_altitude, freefall_time, description
        ) VALUES (
            '${jumpUuid}', (SELECT uuid FROM users WHERE username = '${username}'),
            '${locationUuid}', 1,
            '2026-01-01', 4000, 1000, 55, 'Doomed jump'
        );
        INSERT INTO jumps_to_aircrafts (jump_uuid, aircraft_uuid)
        VALUES ('${jumpUuid}', '${aircraftUuid}');
        INSERT INTO jumps_to_gear (jump_uuid, gear_uuid)
        VALUES ('${jumpUuid}', '${gearUuid}');
        INSERT INTO jumps_to_jump_types (jump_uuid, jump_type_uuid)
        VALUES ('${jumpUuid}', '${jumpTypeUuid}');
        INSERT INTO ai_usage (
            uuid, user_uuid, model, title, created_at, input_tokens, output_tokens,
            total_tokens
        ) VALUES (
            '${usageUuid}',
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

function deleteLogbookDataButton(page: Page) {
    return page
        .locator("form")
        .filter({
            has: page.locator(
                'input[name="action"][value="delete-logbook-data"]',
            ),
        })
        .getByRole("button");
}

test("saving preferences returns to the originating route", async ({
    page,
}) => {
    await registerUser(page, "preferences-back", "Preferences Back");
    await page.goto("/logbook/jumps/new?jumpNumber=42");

    await openMainMenu(page);
    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await expect(page).toHaveURL("/preferences");
    expect(
        await page.evaluate(() =>
            sessionStorage.getItem("return-after-form-post"),
        ),
    ).toContain("/logbook/jumps/new?jumpNumber=42");
    await expect(
        page.locator('input[name="__loki_redirect_back_after_post"]'),
    ).toHaveValue("true");

    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page).toHaveURL("/logbook/jumps/new?jumpNumber=42");
    expect(
        await page.evaluate(() =>
            sessionStorage.getItem("return-after-form-post"),
        ),
    ).toBeNull();
});

test("jump item lists are omitted from the return route", async ({ page }) => {
    await registerUser(page, "ignored-item-list", "Ignored Item List");
    await page.goto("/logbook?search=canopy");

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page.getByRole("link", { name: "Add gear" }).click();
    await page.locator('input[name="name"]').fill("Ignored list canopy");
    await page.getByRole("button", { name: "Add gear" }).click();

    await expect(page).toHaveURL("/logbook?search=canopy");
});

test("a skydiver can update preferences and account details", async ({
    page,
}) => {
    await registerUser(page, "preferences-skydiver", "Preferences Skydiver");

    await openMainMenu(page);
    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await expect(page).toHaveURL("/preferences");
    await expect(page.locator('input[name="htmlCacheEnabled"]')).toBeChecked();
    await expect(page.locator('textarea[name="jumpImagePrompt"]')).toHaveValue(
        /Treat "WS" as the jump type "Wingsuit"/,
    );
    await expect(
        page.locator('textarea[name="jumpImagePrompt"]'),
    ).not.toHaveValue(/Do not combine values from different jumps/);
    await expect(page.locator('input[name="username"]')).toHaveValue(
        "preferences-skydiver",
    );
    await page
        .locator('textarea[name="jumpImagePrompt"]')
        .fill("Custom image prompt");
    await page
        .getByRole("button", { name: "Restore default system prompt" })
        .click();
    await expect(page.locator('textarea[name="jumpImagePrompt"]')).toHaveValue(
        /Treat "WS" as the jump type "Wingsuit"/,
    );
    await page.locator('input[name="username"]').fill("feet-skydiver");
    await page.locator('input[name="displayName"]').fill("Feet Skydiver");
    await page.locator('input[name="email"]').fill("feet@example.test");
    await page.locator('select[name="altitudeUnits"]').selectOption("feet");
    await page
        .locator('select[name="speedUnits"]')
        .selectOption("meters-per-second");
    await page
        .locator('select[name="dateTimeFormat"]')
        .selectOption("american");
    await page
        .locator('select[name="numberFormat"]')
        .selectOption("period-comma");
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
    await expect(page.locator('input[name="username"]')).toHaveValue(
        "feet-skydiver",
    );
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
    await expect(page.locator('select[name="dateTimeFormat"]')).toHaveValue(
        "american",
    );
    await expect(page.locator('select[name="numberFormat"]')).toHaveValue(
        "period-comma",
    );

    await logOut(page);
    await expect(page).toHaveURL("/login");
    await page.locator('input[name="usernameOrEmail"]').fill("feet-skydiver");
    await page.locator('input[name="password"]').fill("new-parachute");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/logbook");
});

test("a skydiver cannot use another account's username", async ({ page }) => {
    await registerUser(page, "existing-username", "Existing User");
    await logOut(page);
    await registerUser(page, "preferences-username", "Preferences User");

    await openMainMenu(page);
    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await page.locator('input[name="username"]').fill("existing-username");
    await page.getByRole("button", { name: "Save preferences" }).click();

    await expect(page).toHaveURL("/preferences");
    await expect(page.getByText("Username is already in use")).toBeVisible();
    await expect(page.locator('input[name="username"]')).toHaveValue(
        "existing-username",
    );
});

test("a skydiver cannot use another account's email", async ({ page }) => {
    await registerUser(page, "existing-email", "Existing Email");
    await logOut(page);
    await registerUser(page, "preferences-email", "Preferences Email");

    await openMainMenu(page);
    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await page
        .locator('input[name="email"]')
        .fill("existing-email@example.test");
    await page.getByRole("button", { name: "Save preferences" }).click();

    await expect(page).toHaveURL("/preferences");
    await expect(
        page.getByText("Email address is already in use"),
    ).toBeVisible();
    await expect(page.locator('input[name="email"]')).toHaveValue(
        "existing-email@example.test",
    );
    const usersWithEmail = await queryPlaywrightDb(`
        SELECT uuid FROM users WHERE email = 'existing-email@example.test'
    `);
    expect(usersWithEmail).toHaveLength(1);
});

test("unit preferences apply throughout the logbook UI", async ({ page }) => {
    const username = "units-skydiver";
    await registerUser(page, username, "Units Skydiver");
    await seedAccountData(username);

    await openMainMenu(page);
    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await page.locator('select[name="altitudeUnits"]').selectOption("feet");
    await page
        .locator('select[name="speedUnits"]')
        .selectOption("meters-per-second");
    await page
        .locator('select[name="dateTimeFormat"]')
        .selectOption("american");
    await page
        .locator('select[name="numberFormat"]')
        .selectOption("period-comma");
    await page.getByRole("button", { name: "Save preferences" }).click();

    const jump = page.getByRole("link", { name: /#1/ });
    await expect(jump).toContainText("13.123 ft");
    await expect(jump).toContainText("3.281 ft");
    await expect(jump).toContainText("54,5 m/s");
    await expect(jump).toContainText("01/01/2026");
    await page.getByLabel("Search jumps").fill("13123");
    await page.getByLabel("Search jumps").press("Enter");
    await expect(page.getByRole("link", { name: /#1/ })).toBeVisible();
    await page.getByRole("link", { name: "Clear search" }).click();

    await page.getByRole("link", { name: /#1/ }).click();
    await expect(page.locator('input[name="exitAltitude"]')).toHaveValue(
        "13123",
    );
    await expect(page.locator('input[name="openingAltitude"]')).toHaveValue(
        "3281",
    );

    await page.getByRole("link", { name: /Units Skydiver's logbook/ }).click();
    await page.getByRole("link", { name: "Statistics", exact: true }).click();
    await page.getByRole("link", { name: "View yearly statistics" }).click();
    await expect(
        page.getByText("Total freefall distance").locator(".."),
    ).toContainText("1,9 mi");
    await expect(
        page.getByText("Longest freefall distance").locator(".."),
    ).toContainText("1,9 mi");
    await expect(
        page.getByText("Highest jump altitude").locator(".."),
    ).toContainText("13.123 ft");
    await expect(
        page.getByText("Fastest average freefall speed").locator(".."),
    ).toContainText("54,5 m/s");
    await expect(page.getByText("Jump #1 (01/01/2026)").first()).toBeVisible();
});

test("a skydiver can delete all logbook data without deleting their account", async ({
    page,
}) => {
    const username = "delete-logbook-data-skydiver";
    await registerUser(page, username, "Delete Logbook Data Skydiver");
    const userUuid = await seedAccountData(username);

    await openMainMenu(page);
    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await openDangerZone(page);
    const button = deleteLogbookDataButton(page);
    await expect(button).toHaveText("Delete logbook data");
    await button.click();
    await expect(button).toHaveText("Confirm delete", { timeout: 1000 });
    await button.click();

    await expect(page).toHaveURL("/logbook");
    await expect(page.getByRole("link", { name: /#1/ })).toHaveCount(0);
    const counts = (
        await queryPlaywrightDb(`
            SELECT
                (SELECT count(*) FROM users WHERE uuid = '${userUuid}') AS users,
                (SELECT count(*) FROM jumps WHERE user_uuid = '${userUuid}') AS jumps,
                (SELECT count(*) FROM gear WHERE user_uuid = '${userUuid}') AS gear,
                (SELECT count(*) FROM jump_types WHERE user_uuid = '${userUuid}') AS jump_types,
                (SELECT count(*) FROM aircrafts WHERE user_uuid = '${userUuid}') AS aircrafts,
                (SELECT count(*) FROM locations WHERE user_uuid = '${userUuid}') AS locations,
                (SELECT count(*) FROM ai_usage WHERE user_uuid = '${userUuid}') AS ai_usage;
        `)
    )[0];
    expect(Number(counts?.users)).toBe(1);
    expect(Number(counts?.jumps)).toBe(0);
    expect(Number(counts?.gear)).toBe(0);
    expect(Number(counts?.jump_types)).toBe(0);
    expect(Number(counts?.aircrafts)).toBe(0);
    expect(Number(counts?.locations)).toBe(0);
    expect(Number(counts?.ai_usage)).toBe(1);
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
    await openDangerZone(page);

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
    await expect(page.getByText("EFUT", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: `${displayName}'s logbook` }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await expect(page.getByText("Doomed Plane", { exact: true })).toHaveCount(
        0,
    );
    await expect(
        page.getByText("Cessna Caravan", { exact: true }),
    ).toBeVisible();

    await page.getByRole("link", { name: `${displayName}'s logbook` }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await expect(page.getByText("Doomed Canopy", { exact: true })).toHaveCount(
        0,
    );
    for (const name of ["PD Navigator", "PD Sabre 2", "SQRL Freak 5"]) {
        await expect(page.getByText(name, { exact: true })).toBeVisible();
    }

    await page.getByRole("link", { name: `${displayName}'s logbook` }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage jump types" }).click();
    await expect(page.getByText("Doomed Type", { exact: true })).toHaveCount(0);

    await page.getByRole("link", { name: `${displayName}'s logbook` }).click();
    await page.getByRole("link", { name: "AI Vision", exact: true }).click();
    await expect(page.getByText("No image reads yet.")).toBeVisible();
});
