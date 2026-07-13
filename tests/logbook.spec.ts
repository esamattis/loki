import { expect, test, type Page } from "@playwright/test";

async function openManageLogbook(page: Page) {
    await page.getByRole("button", { name: "Manage logbook" }).click();
}

test("the log book loads additional jumps while scrolling", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("scrolling-skydiver");
    await page.locator('input[name="displayName"]').fill("Scrolling Skydiver");
    await page.locator('input[name="email"]').fill("scrolling@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page.getByRole("link", { name: "Add location" }).click();
    await page.locator('input[name="name"]').fill("Scroll Drop Zone");
    await page.getByRole("button", { name: "Add location" }).click();

    await page
        .getByRole("link", { name: /Scrolling Skydiver's logbook/ })
        .click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page.getByRole("link", { name: "Add aircraft" }).click();
    await page.locator('input[name="name"]').fill("Scroll Plane");
    await page.getByRole("button", { name: "Add aircraft" }).click();

    await page
        .getByRole("link", { name: /Scrolling Skydiver's logbook/ })
        .click();
    for (let jumpNumber = 1; jumpNumber <= 25; jumpNumber++) {
        await page.getByRole("link", { name: "Add jump", exact: true }).click();
        await page.locator('input[name="jumpNumber"]').fill(String(jumpNumber));
        await page.locator('input[name="exitAltitude"]').fill("4000");
        await page.locator('input[name="openingAltitude"]').fill("1000");
        await page.locator('input[name="freefallTime"]').fill("55");
        await page.locator('select[name="locationUuid"]').selectOption({
            label: "Scroll Drop Zone",
        });
        await page.locator('select[name="aircraftUuid"]').selectOption({
            label: "Scroll Plane",
        });
        await page.getByRole("button", { name: "Add jump" }).click();
    }

    await expect(page.getByRole("link", { name: /#\d+/ })).toHaveCount(24);
    const loadMore = page.getByText("Loading more jumps...");
    await loadMore.scrollIntoViewIfNeeded();
    await expect(page.getByRole("link", { name: /#\d+/ })).toHaveCount(25);
    await expect(page.getByRole("link", { name: /^#1 / })).toBeVisible();
    await expect(loadMore).toHaveCount(0);
});

// eslint-disable-next-line max-lines-per-function
test("a skydiver can register and record their first jump", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("skydiver");
    await page.locator('input[name="displayName"]').fill("Test Skydiver");
    await page.locator('input[name="email"]').fill("skydiver@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL("/logbook");

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page.getByRole("link", { name: "Add gear" }).click();
    await page.locator('input[name="name"]').fill("Main canopy");
    await page.locator('input[name="previousCount"]').fill("12");
    await page.getByRole("button", { name: "Add gear" }).click();
    await expect(page).toHaveURL("/logbook/gear");

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage jump types" }).click();
    await expect(page).toHaveURL("/logbook/jump-types");
    for (const name of [
        "Cutaway",
        "FS",
        "Static Line",
        "Wingsuit",
        "Freefly",
        "AFF",
    ]) {
        await expect(page.getByText(name, { exact: true })).toBeVisible();
    }

    await page.getByRole("link", { name: "Add jump type" }).click();
    await page.locator('input[name="name"]').fill("Tracking");
    await page.locator('input[name="previousCount"]').fill("4");
    await page.getByRole("button", { name: "Add jump type" }).click();
    await expect(page).toHaveURL("/logbook/jump-types");

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page.getByRole("link", { name: "Add location" }).click();
    await page.locator('input[name="name"]').fill("Skydive Test Center");
    await page.locator('input[name="previousCount"]').fill("50");
    await page.getByRole("button", { name: "Add location" }).click();
    await expect(page).toHaveURL("/logbook/locations");

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page.getByRole("link", { name: "Add aircraft" }).click();
    await page.locator('input[name="name"]').fill("Cessna 182");
    await page.locator('input[name="previousCount"]').fill("25");
    await page.getByRole("button", { name: "Add aircraft" }).click();
    await expect(page).toHaveURL("/logbook/aircrafts");

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator('input[name="jumpDate"]').fill("2024-06-15");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await page.locator('select[name="locationUuid"]').selectOption({
        label: "Skydive Test Center",
    });
    await page.locator('select[name="aircraftUuid"]').selectOption({
        label: "Cessna 182",
    });
    await page.getByRole("checkbox", { name: "Main canopy" }).check();
    await page.getByRole("checkbox", { name: "Freefly" }).check();
    await page.getByRole("checkbox", { name: "Tracking" }).check();
    await page.locator('textarea[name="description"]').fill("First test jump");
    await page.getByRole("button", { name: "Add jump" }).click();

    await expect(page).toHaveURL("/logbook");
    await expect(page.getByRole("link", { name: /#1/ })).toContainText(
        "Skydive Test Center / Cessna 182",
    );
    await expect(page.getByText("First test jump")).toBeVisible();
    await expect(page.getByText("4000 m", { exact: true })).toBeVisible();
    await expect(page.getByText("1000 m", { exact: true })).toBeVisible();
    await expect(
        page
            .getByRole("link", { name: /#1/ })
            .getByText("55 s", { exact: true }),
    ).toBeVisible();
    await expect(
        page.getByText("Total freefall", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Total freefall time")).toBeVisible();
    await expect(page.getByText("Active jump years")).toBeVisible();
    await expect(page.getByText("3 km").first()).toBeVisible();
    await expect(
        page.getByRole("link", { name: /#1/ }).getByText("Freefly"),
    ).toBeVisible();
    await expect(
        page.getByRole("link", { name: /#1/ }).getByText("Tracking"),
    ).toBeVisible();

    await page.getByText("Filter jumps", { exact: true }).click();
    await page.getByRole("checkbox", { name: "Freefly" }).check();
    await page.getByRole("checkbox", { name: "Tracking" }).check();
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/\/logbook\?jumpTypeUuids=/);
    await expect(page.getByRole("link", { name: /#1/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /#2/ })).toHaveCount(0);

    await page.getByRole("link", { name: /#1/ }).click();
    await expect(
        page.locator('select[name="locationUuid"] option:checked'),
    ).toHaveText("Skydive Test Center");
    await expect(
        page.locator('select[name="aircraftUuid"] option:checked'),
    ).toHaveText("Cessna 182");
    await page.getByRole("link", { name: "Copy to new" }).click();

    await expect(page).toHaveURL(/\/logbook\/jumps\/new\?from=/);
    await expect(page.locator('input[name="jumpNumber"]')).toHaveValue("2");
    await expect(page.locator('input[name="jumpDate"]')).toHaveValue(
        "2024-06-15",
    );
    await page.getByRole("button", { name: "Today" }).click();
    const today = new Date();
    const todayValue = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
    ].join("-");
    await expect(page.locator('input[name="jumpDate"]')).toHaveValue(
        todayValue,
    );
    await page.locator('input[name="jumpDate"]').fill("2024-06-15");
    await expect(page.locator('input[name="exitAltitude"]')).toHaveValue(
        "4000",
    );
    await expect(page.locator('input[name="openingAltitude"]')).toHaveValue(
        "1000",
    );
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("55");
    await expect(page.locator('select[name="locationUuid"]')).toHaveValue(/.+/);
    await expect(page.locator('select[name="aircraftUuid"]')).toHaveValue(/.+/);
    await expect(
        page.getByRole("checkbox", { name: "Main canopy" }),
    ).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Freefly" })).toBeChecked();
    await expect(
        page.getByRole("checkbox", { name: "Tracking" }),
    ).toBeChecked();
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "First test jump",
    );
    await page.getByRole("button", { name: "Add jump" }).click();

    await expect(page).toHaveURL("/logbook");
    await expect(page.getByRole("link", { name: /#2/ })).toContainText(
        "Skydive Test Center / Cessna 182",
    );

    await page.getByRole("link", { name: "Add jump", exact: true }).click();

    await expect(page).toHaveURL("/logbook/jumps/new");
    await expect(page.locator('input[name="jumpNumber"]')).toHaveValue("3");
    await expect(page.locator('input[name="jumpDate"]')).toHaveValue(
        "2024-06-15",
    );
    await expect(page.locator('input[name="exitAltitude"]')).toHaveValue(
        "4000",
    );
    await expect(page.locator('input[name="openingAltitude"]')).toHaveValue(
        "1000",
    );
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("55");
    await expect(page.locator('select[name="locationUuid"]')).toHaveValue(/.+/);
    await expect(page.locator('select[name="aircraftUuid"]')).toHaveValue(/.+/);
    await expect(
        page.getByRole("checkbox", { name: "Main canopy" }),
    ).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Freefly" })).toBeChecked();
    await expect(
        page.getByRole("checkbox", { name: "Tracking" }),
    ).toBeChecked();
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "First test jump",
    );

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page.getByRole("link", { name: "Edit" }).click();
    await page.locator('input[name="name"]').fill("Main canopy updated");
    await page.locator('input[name="previousCount"]').fill("15");
    await page.locator('textarea[name="description"]').fill("Updated gear");
    await page.getByRole("button", { name: "Save gear" }).click();
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page.locator('input[name="name"]')).toHaveValue(
        "Main canopy updated",
    );
    await expect(page.locator('input[name="previousCount"]')).toHaveValue("15");
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "Updated gear",
    );

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage jump types" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Freefly" })
        .getByRole("link", { name: "Edit" })
        .click();
    await page.locator('input[name="name"]').fill("Freefly updated");
    await page.locator('input[name="previousCount"]').fill("9");
    await page
        .locator('textarea[name="description"]')
        .fill("Updated freefly type");
    await page.getByRole("button", { name: "Save jump type" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Freefly updated" })
        .getByRole("link", { name: "Edit" })
        .click();
    await expect(page.locator('input[name="name"]')).toHaveValue(
        "Freefly updated",
    );
    await expect(page.locator('input[name="previousCount"]')).toHaveValue("9");
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "Updated freefly type",
    );

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage jump types" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Tracking" })
        .getByRole("link", { name: "Edit" })
        .click();
    await page.locator('input[name="name"]').fill("Tracking updated");
    await page.locator('input[name="previousCount"]').fill("5");
    await page
        .locator('textarea[name="description"]')
        .fill("Updated tracking type");
    await page.getByRole("button", { name: "Save jump type" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Tracking updated" })
        .getByRole("link", { name: "Edit" })
        .click();
    await expect(page.locator('input[name="name"]')).toHaveValue(
        "Tracking updated",
    );
    await expect(page.locator('input[name="previousCount"]')).toHaveValue("5");
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "Updated tracking type",
    );

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page.getByRole("link", { name: "Edit" }).click();
    await page.locator('input[name="name"]').fill("Skydive Updated Center");
    await page.locator('input[name="previousCount"]').fill("55");
    await page.locator('textarea[name="description"]').fill("Updated location");
    await page.getByRole("button", { name: "Save location" }).click();
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page.locator('input[name="name"]')).toHaveValue(
        "Skydive Updated Center",
    );
    await expect(page.locator('input[name="previousCount"]')).toHaveValue("55");
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "Updated location",
    );

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page.getByRole("link", { name: "Edit" }).click();
    await page.locator('input[name="name"]').fill("Cessna 206");
    await page.locator('input[name="previousCount"]').fill("30");
    await page.locator('textarea[name="description"]').fill("Updated aircraft");
    await page.getByRole("button", { name: "Save aircraft" }).click();
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page.locator('input[name="name"]')).toHaveValue("Cessna 206");
    await expect(page.locator('input[name="previousCount"]')).toHaveValue("30");
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "Updated aircraft",
    );

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Main canopy updated" })
        .getByRole("button", { name: "Archive" })
        .click();
    await expect(
        page
            .getByRole("listitem")
            .filter({ hasText: "Main canopy updated" })
            .getByText("Archived", { exact: true }),
    ).toBeVisible();

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage jump types" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Freefly updated" })
        .getByRole("button", { name: "Archive" })
        .click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Tracking updated" })
        .getByRole("button", { name: "Archive" })
        .click();

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Skydive Updated Center" })
        .getByRole("button", { name: "Archive" })
        .click();

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Cessna 206" })
        .getByRole("button", { name: "Archive" })
        .click();

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await expect(
        page.getByText("Freefly updated", { exact: true }),
    ).not.toHaveCount(0);
    await expect(
        page.getByText("Tracking updated", { exact: true }),
    ).not.toHaveCount(0);
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await expect(
        page.getByRole("option", { name: "Skydive Updated Center" }),
    ).toHaveCount(0);
    await expect(page.getByRole("option", { name: "Cessna 206" })).toHaveCount(
        0,
    );
    await expect(
        page.getByRole("checkbox", { name: "Main canopy updated" }),
    ).toHaveCount(0);
    await expect(
        page.getByRole("checkbox", { name: "Freefly updated" }),
    ).toHaveCount(0);

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Main canopy updated" })
        .getByRole("button", { name: "Unarchive" })
        .click();

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await expect(
        page.getByRole("checkbox", { name: "Main canopy updated" }),
    ).toBeVisible();
});

test("gear can be converted to a jump type with its jump references", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("conversion-skydiver");
    await page.locator('input[name="displayName"]').fill("Conversion Skydiver");
    await page.locator('input[name="email"]').fill("conversion@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page.getByRole("link", { name: "Add gear" }).click();
    await page.locator('input[name="name"]').fill("Convertible gear");
    await page.locator('input[name="previousCount"]').fill("12");
    await page
        .locator('textarea[name="description"]')
        .fill("Convertible description");
    await page.getByRole("button", { name: "Add gear" }).click();

    await page
        .getByRole("link", { name: /Conversion Skydiver's logbook/ })
        .click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page.getByRole("link", { name: "Add location" }).click();
    await page.locator('input[name="name"]').fill("Conversion location");
    await page.getByRole("button", { name: "Add location" }).click();

    await page
        .getByRole("link", { name: /Conversion Skydiver's logbook/ })
        .click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page.getByRole("link", { name: "Add aircraft" }).click();
    await page.locator('input[name="name"]').fill("Conversion aircraft");
    await page.getByRole("button", { name: "Add aircraft" }).click();

    await page
        .getByRole("link", { name: /Conversion Skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await page.locator('select[name="locationUuid"]').selectOption({
        label: "Conversion location",
    });
    await page.locator('select[name="aircraftUuid"]').selectOption({
        label: "Conversion aircraft",
    });
    await page.getByRole("checkbox", { name: "Convertible gear" }).check();
    await page.getByRole("button", { name: "Add jump" }).click();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page.getByRole("button", { name: "Convert to jump type" }).click();
    await expect(page).toHaveURL(/\/logbook\/jump-types\/.+/);
    await expect(page.locator('input[name="name"]')).toHaveValue(
        "Convertible gear",
    );
    await expect(page.locator('input[name="previousCount"]')).toHaveValue("12");
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "Convertible description",
    );

    await page
        .getByRole("link", { name: /Conversion Skydiver's logbook/ })
        .click();
    await expect(
        page.getByRole("link", { name: /#1/ }).getByText("Convertible gear"),
    ).toBeVisible();
    await page.getByRole("link", { name: /#1/ }).click();
    await expect(
        page.getByRole("checkbox", { name: "Convertible gear" }),
    ).toBeChecked();
});

// eslint-disable-next-line max-lines-per-function
test("a skydiver can create jump items from the add jump form", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("inline-items-skydiver");
    await page.locator('input[name="displayName"]').fill("Inline Skydiver");
    await page.locator('input[name="email"]').fill("inline-items@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator('input[name="jumpDate"]').fill("2024-07-01");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await page.locator('input[name="locationName"]').fill("Inline Drop Zone");
    await page.locator('input[name="aircraftName"]').fill("Inline Plane");
    await page.locator('input[name="gearName"]').fill("Inline Canopy");
    await page.locator('input[name="jumpTypeName"]').fill("Inline Tracking");
    await page.getByRole("button", { name: "Add jump" }).click();

    await expect(page).toHaveURL("/logbook");
    await expect(page.getByRole("link", { name: /#1/ })).toContainText(
        "Inline Drop Zone / Inline Plane",
    );
    await expect(
        page.getByRole("link", { name: /#1/ }).getByText("Inline Tracking"),
    ).toBeVisible();

    await page.getByRole("link", { name: /#1/ }).click();
    await expect(
        page.locator('select[name="locationUuid"] option:checked'),
    ).toHaveText("Inline Drop Zone");
    await expect(
        page.locator('select[name="aircraftUuid"] option:checked'),
    ).toHaveText("Inline Plane");
    await expect(
        page.getByRole("checkbox", { name: "Inline Canopy" }),
    ).toBeChecked();
    await expect(
        page.getByRole("checkbox", { name: "Inline Tracking" }),
    ).toBeChecked();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await expect(
        page.getByText("Inline Drop Zone", { exact: true }),
    ).toBeVisible();

    await page.getByRole("link", { name: /Inline Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await expect(page.getByText("Inline Plane", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: /Inline Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await expect(
        page.getByText("Inline Canopy", { exact: true }),
    ).toBeVisible();

    await page.getByRole("link", { name: /Inline Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage jump types" }).click();
    await expect(
        page.getByText("Inline Tracking", { exact: true }),
    ).toBeVisible();
});

test("next jump number button restores max plus one", async ({ page }) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("next-jump-number");
    await page.locator('input[name="displayName"]').fill("Next Number Jumper");
    await page
        .locator('input[name="email"]')
        .fill("next-jump-number@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page.getByRole("link", { name: "Add location" }).click();
    await page.locator('input[name="name"]').fill("Next Number Drop Zone");
    await page.getByRole("button", { name: "Add location" }).click();

    await page
        .getByRole("link", { name: /Next Number Jumper's logbook/ })
        .click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page.getByRole("link", { name: "Add aircraft" }).click();
    await page.locator('input[name="name"]').fill("Next Number Plane");
    await page.getByRole("button", { name: "Add aircraft" }).click();

    await page
        .getByRole("link", { name: /Next Number Jumper's logbook/ })
        .click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("5");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await page.locator('select[name="locationUuid"]').selectOption({
        label: "Next Number Drop Zone",
    });
    await page.locator('select[name="aircraftUuid"]').selectOption({
        label: "Next Number Plane",
    });
    await page.getByRole("button", { name: "Add jump" }).click();
    await expect(page).toHaveURL("/logbook");

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await expect(page.locator('input[name="jumpNumber"]')).toHaveValue("6");
    await expect(page.locator('input[name="jumpNumber"]')).toHaveAttribute(
        "data-next-jump-number",
        "6",
    );

    await page.locator('input[name="jumpNumber"]').fill("99");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.locator('input[name="jumpNumber"]')).toHaveValue("6");
});

test("adding a jump with an existing jump number shows an error and link", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("duplicate-jump-number");
    await page.locator('input[name="displayName"]').fill("Duplicate Jumper");
    await page
        .locator('input[name="email"]')
        .fill("duplicate-jump-number@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page.getByRole("link", { name: "Add location" }).click();
    await page.locator('input[name="name"]').fill("Duplicate Drop Zone");
    await page.getByRole("button", { name: "Add location" }).click();

    await page
        .getByRole("link", { name: /Duplicate Jumper's logbook/ })
        .click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page.getByRole("link", { name: "Add aircraft" }).click();
    await page.locator('input[name="name"]').fill("Duplicate Plane");
    await page.getByRole("button", { name: "Add aircraft" }).click();

    await page
        .getByRole("link", { name: /Duplicate Jumper's logbook/ })
        .click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await page.locator('select[name="locationUuid"]').selectOption({
        label: "Duplicate Drop Zone",
    });
    await page.locator('select[name="aircraftUuid"]').selectOption({
        label: "Duplicate Plane",
    });
    await page.getByRole("button", { name: "Add jump" }).click();
    await expect(page).toHaveURL("/logbook");

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator('input[name="exitAltitude"]').fill("3500");
    await page.locator('input[name="openingAltitude"]').fill("900");
    await page.locator('input[name="freefallTime"]').fill("45");
    await page.locator('select[name="locationUuid"]').selectOption({
        label: "Duplicate Drop Zone",
    });
    await page.locator('select[name="aircraftUuid"]').selectOption({
        label: "Duplicate Plane",
    });
    await page.getByRole("button", { name: "Add jump" }).click();

    await expect(page).toHaveURL("/logbook/jumps/new");
    await expect(
        page.getByText("Jump number 1 is already used."),
    ).toBeVisible();
    await page.getByRole("link", { name: "Open existing jump" }).click();
    await expect(page).toHaveURL(/\/logbook\/jumps\/.+/);
    await expect(page.locator('input[name="jumpNumber"]')).toHaveValue("1");
});

test("freefall time can be estimated from freefall type", async ({ page }) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("estimate-freefall");
    await page.locator('input[name="displayName"]').fill("Estimate Jumper");
    await page
        .locator('input[name="email"]')
        .fill("estimate-freefall@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");

    await page.getByRole("button", { name: "Estimate" }).click();
    await expect(
        page.getByRole("heading", { name: "Estimate freefall time" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Belly · 180 km/h" }).click();
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("60");
    await expect(page.getByText("Avg speed: 180 km/h")).toBeVisible();

    await page.getByRole("button", { name: "Estimate" }).click();
    await page.getByRole("button", { name: "Freefly · 240 km/h" }).click();
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("45");
    await expect(page.getByText("Avg speed: 240 km/h")).toBeVisible();

    await page.getByRole("button", { name: "Estimate" }).click();
    await page.getByRole("button", { name: "Wingsuit · 80 km/h" }).click();
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("135");
    await expect(page.getByText("Avg speed: 80 km/h")).toBeVisible();
});
