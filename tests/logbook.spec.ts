import { expect, test } from "@playwright/test";

test("a skydiver can register and record their first jump", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="username"]').fill("skydiver");
    await page.locator('input[name="displayName"]').fill("Test Skydiver");
    await page.locator('input[name="email"]').fill("skydiver@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL("/logbook");

    await page.getByRole("link", { name: "Manage gear" }).click();
    await page.getByRole("link", { name: "Add gear" }).click();
    await page.locator('input[name="name"]').fill("Main canopy");
    await page.locator('input[name="previousCount"]').fill("12");
    await page.getByRole("button", { name: "Add gear" }).click();
    await expect(page).toHaveURL("/logbook/gear");

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await page.getByRole("link", { name: "Manage jump types" }).click();
    await page.getByRole("link", { name: "Add jump type" }).click();
    await page.locator('input[name="name"]').fill("Freefly");
    await page.locator('input[name="previousCount"]').fill("8");
    await page.getByRole("button", { name: "Add jump type" }).click();
    await expect(page).toHaveURL("/logbook/jump-types");

    await page.getByRole("link", { name: "Add jump type" }).click();
    await page.locator('input[name="name"]').fill("Tracking");
    await page.locator('input[name="previousCount"]').fill("4");
    await page.getByRole("button", { name: "Add jump type" }).click();
    await expect(page).toHaveURL("/logbook/jump-types");

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page.getByRole("link", { name: "Add location" }).click();
    await page.locator('input[name="name"]').fill("Skydive Test Center");
    await page.locator('input[name="previousCount"]').fill("50");
    await page.getByRole("button", { name: "Add location" }).click();
    await expect(page).toHaveURL("/logbook/locations");

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page.getByRole("link", { name: "Add aircraft" }).click();
    await page.locator('input[name="name"]').fill("Cessna 182");
    await page.locator('input[name="previousCount"]').fill("25");
    await page.getByRole("button", { name: "Add aircraft" }).click();
    await expect(page).toHaveURL("/logbook/aircrafts");

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
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
    await expect(page.getByRole("link", { name: /Jump #1/ })).toContainText(
        "Skydive Test Center / Cessna 182",
    );
    await expect(page.getByText("First test jump")).toBeVisible();
    await expect(
        page.getByText("Exit 4000 m / Opening 1000 m / Freefall 55 s"),
    ).toBeVisible();

    await page.getByRole("link", { name: /Jump #1/ }).click();
    await page.getByRole("link", { name: "Copy to new" }).click();

    await expect(page).toHaveURL(/\/logbook\/jumps\/new\?from=/);
    await expect(page.locator('input[name="jumpNumber"]')).toHaveValue("2");
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
    await expect(page.getByRole("link", { name: /Jump #2/ })).toContainText(
        "Skydive Test Center / Cessna 182",
    );

    await page.getByRole("link", { name: "Add jump", exact: true }).click();

    await expect(page).toHaveURL("/logbook/jumps/new");
    await expect(page.locator('input[name="jumpNumber"]')).toHaveValue("3");
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
});
