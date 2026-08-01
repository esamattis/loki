import { acceptPrivacyPolicyIfRequired } from "./helpers";
import { updatePlaywrightUserOptions } from "../core/helpers";
import { expect, test, type Page, type PlaywrightDatabase } from "./fixtures";
import {
    logOut,
    openDangerZone,
    openMainMenu,
    openManageLogbook,
} from "./helpers";
import { and, count, eq, isNull } from "drizzle-orm";
import {
    aiUsage,
    aircrafts,
    gear,
    jumps,
    jumpsToAircrafts,
    jumpsToGear,
    jumpsToJumpTypes,
    jumpTypes,
    locations,
    users,
} from "@/app/schema";

test("clearing the image prompt restores the default", async ({ page }) => {
    await registerUser(page, "preferences-default-prompt", "Default Prompt");
    await page.goto("/preferences");
    await page.locator('textarea[name="jumpImagePrompt"]').fill("   ");
    await page.getByRole("button", { name: "Save preferences" }).click();

    await expect(page).toHaveURL("/logbook");
    await page.goto("/preferences");
    await expect(page.locator('textarea[name="jumpImagePrompt"]')).toHaveValue(
        /Treat "WS" as the jump type "Wingsuit"/,
    );
});

test("invalid logbook preferences show errors and retain values", async ({
    page,
}) => {
    await registerUser(page, "preferences-invalid-logbook", "Invalid Logbook");
    await page.goto("/preferences");
    await page
        .locator('textarea[name="jumpImagePrompt"]')
        .fill("Retain this submitted prompt");
    await page.locator('input[name="openaiApiKey"]').fill("submitted-api-key");
    await page.locator('select[name="altitudeUnits"]').evaluate((select) => {
        if (!(select instanceof HTMLSelectElement))
            throw new Error("Expected altitude units select");
        const option = document.createElement("option");
        option.value = "invalid";
        option.selected = true;
        select.add(option);
    });
    await page.getByRole("button", { name: "Save preferences" }).click();

    await expect(page).toHaveURL("/preferences");
    await expect(page.getByText(/Invalid option/)).toBeVisible();
    await expect(page.locator('textarea[name="jumpImagePrompt"]')).toHaveValue(
        "Retain this submitted prompt",
    );
    await expect(page.locator('input[name="openaiApiKey"]')).toHaveValue(
        "submitted-api-key",
    );
    await expect(page.locator('input[name="openaiApiKey"]')).toHaveAttribute(
        "type",
        "password",
    );
});

test("the stored OpenAI API key is masked and editable", async ({
    page,
    db,
}) => {
    const username = "preferences-api-key";
    await registerUser(page, username, "API Key");
    await updatePlaywrightUserOptions(db, {
        username,
        updates: { openaiApiKey: "stored-api-key" },
    });

    await page.goto("/preferences");
    const apiKey = page.locator('input[name="openaiApiKey"]');
    await expect(apiKey).toHaveAttribute("type", "password");
    await expect(apiKey).toHaveValue("stored-api-key");
    await apiKey.fill("edited-api-key");
    await expect(apiKey).toHaveValue("edited-api-key");
});

test("preference updates preserve unrelated options", async ({ page, db }) => {
    const username = "preferences-option-round-trip";
    await registerUser(page, username, "Option Round Trip");
    await updatePlaywrightUserOptions(db, {
        username,
        updates: {
            altitudeUnits: "feet",
            jumpImagePrompt: "Preserve app option",
        },
    });

    await page.goto("/preferences");
    await page
        .locator('select[name="dateTimeFormat"]')
        .selectOption("american");
    await page.getByRole("button", { name: "Save preferences" }).click();

    const [storedUser] = await db
        .select({ options: users.options })
        .from(users)
        .where(eq(users.username, username));
    expect(JSON.parse(storedUser?.options ?? "{}")).toMatchObject({
        altitudeUnits: "feet",
        jumpImagePrompt: "Preserve app option",
        dateTimeFormat: "american",
    });
});

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

async function seedAccountData(
    db: PlaywrightDatabase,
    username: string,
): Promise<string> {
    const locationUuid = `${username}-location`;
    const aircraftUuid = `${username}-aircraft`;
    const gearUuid = `${username}-gear`;
    const jumpTypeUuid = `${username}-jump-type`;
    const jumpUuid = `${username}-jump`;
    const usageUuid = `${username}-ai-usage`;
    const [user] = await db
        .select({ uuid: users.uuid })
        .from(users)
        .where(eq(users.username, username));
    if (!user) throw new Error(`Expected user ${username}`);
    await db.insert(locations).values({
        uuid: locationUuid,
        userUuid: user.uuid,
        name: "Doomed DZ",
    });
    await db.insert(aircrafts).values({
        uuid: aircraftUuid,
        userUuid: user.uuid,
        name: "Doomed Plane",
    });
    await db.insert(gear).values({
        uuid: gearUuid,
        userUuid: user.uuid,
        name: "Doomed Canopy",
    });
    await db.insert(jumpTypes).values({
        uuid: jumpTypeUuid,
        userUuid: user.uuid,
        name: "Doomed Type",
    });
    await db.insert(jumps).values({
        uuid: jumpUuid,
        userUuid: user.uuid,
        locationUuid,
        jumpNumber: 1,
        jumpDate: "2026-01-01",
        exitAltitude: 4000,
        openingAltitude: 1000,
        freefallTime: 55,
        description: "Doomed jump",
    });
    await db.insert(jumpsToAircrafts).values({ jumpUuid, aircraftUuid });
    await db.insert(jumpsToGear).values({ jumpUuid, gearUuid });
    await db.insert(jumpsToJumpTypes).values({ jumpUuid, jumpTypeUuid });
    await db.insert(aiUsage).values({
        uuid: usageUuid,
        userUuid: user.uuid,
        model: "gpt-4.1-mini",
        title: "Doomed image read",
        createdAt: 0,
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2,
    });
    return user.uuid;
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

test("a skydiver cannot use another account's email", async ({ page, db }) => {
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
    const usersWithEmail = await db
        .select({ uuid: users.uuid })
        .from(users)
        .where(eq(users.email, "existing-email@example.test"));
    expect(usersWithEmail).toHaveLength(1);
});

test("unit preferences apply throughout the logbook UI", async ({
    page,
    db,
}) => {
    const username = "units-skydiver";
    await registerUser(page, username, "Units Skydiver");
    await seedAccountData(db, username);

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
    db,
}) => {
    const username = "delete-logbook-data-skydiver";
    await registerUser(page, username, "Delete Logbook Data Skydiver");
    const userUuid = await seedAccountData(db, username);

    await openMainMenu(page);
    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await expect(page).toHaveURL("/preferences");
    await page.goto("/preferences#danger-zone");
    await expect(page).toHaveURL("/preferences#danger-zone");
    await openDangerZone(page);
    const button = deleteLogbookDataButton(page);
    const deleteForm = button.locator("..");
    await expect(deleteForm).toHaveAttribute("action", "/preferences/logbook");
    await expect(deleteForm).not.toHaveAttribute("data-loki-confirm");
    await expect(
        deleteForm.locator('input[name="__loki_redirect_back_after_post"]'),
    ).toHaveCount(0);
    await expect(button).toHaveText("Delete logbook data");
    await button.click();
    await expect(button).toHaveText("Confirm delete", { timeout: 1000 });
    await button.click();

    await expect(page).toHaveURL("/logbook");
    await expect(page.getByRole("link", { name: /#1/ })).toHaveCount(0);
    const [userCount, jumpCount, gearCount, jumpTypeCount, aircraftCount] =
        await Promise.all([
            db
                .select({ count: count() })
                .from(users)
                .where(eq(users.uuid, userUuid)),
            db
                .select({ count: count() })
                .from(jumps)
                .where(eq(jumps.userUuid, userUuid)),
            db
                .select({ count: count() })
                .from(gear)
                .where(eq(gear.userUuid, userUuid)),
            db
                .select({ count: count() })
                .from(jumpTypes)
                .where(eq(jumpTypes.userUuid, userUuid)),
            db
                .select({ count: count() })
                .from(aircrafts)
                .where(eq(aircrafts.userUuid, userUuid)),
        ]);
    const [locationCount, usageCount] = await Promise.all([
        db
            .select({ count: count() })
            .from(locations)
            .where(eq(locations.userUuid, userUuid)),
        db
            .select({ count: count() })
            .from(aiUsage)
            .where(eq(aiUsage.userUuid, userUuid)),
    ]);
    expect(userCount[0]?.count).toBe(1);
    expect(jumpCount[0]?.count).toBe(0);
    expect(gearCount[0]?.count).toBe(0);
    expect(jumpTypeCount[0]?.count).toBe(0);
    expect(aircraftCount[0]?.count).toBe(0);
    expect(locationCount[0]?.count).toBe(0);
    expect(usageCount[0]?.count).toBe(1);
});

// eslint-disable-next-line max-lines-per-function
test("a skydiver can permanently delete their account and all jump items", async ({
    page,
    db,
}) => {
    const username = "delete-account-skydiver";
    const displayName = "Delete Account Skydiver";
    await registerUser(page, username, displayName);

    const userUuid = await seedAccountData(db, username);

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

    const [totalUsage, scrubbedUsage, linkedUsage] = await Promise.all([
        db.select({ count: count() }).from(aiUsage),
        db
            .select({ count: count() })
            .from(aiUsage)
            .where(
                and(
                    isNull(aiUsage.userUuid),
                    eq(aiUsage.title, "Deleted account"),
                ),
            ),
        db
            .select({ count: count() })
            .from(aiUsage)
            .where(eq(aiUsage.userUuid, userUuid)),
    ]);
    const totalUsageAfter = totalUsage[0]?.count ?? 0;
    expect(totalUsageAfter).toBeGreaterThan(0);

    expect(scrubbedUsage[0]?.count).toBeGreaterThanOrEqual(1);

    const linkedToDeletedUser = linkedUsage[0]?.count;
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
