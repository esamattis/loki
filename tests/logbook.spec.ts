import { expect, test } from "./fixtures";
import {
    expectLogbookAroundJump,
    jumpItemSummary,
    openDangerZone,
    openMainMenu,
    openManageLogbook,
    openJumpItemSelect,
    resetFormDirtyForTest,
    selectJumpItems,
} from "./helpers";

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
    for (const location of ["EFUT", "EFJY", "EFAL", "EFSE", "EFLP"]) {
        await page
            .getByRole("listitem")
            .filter({ hasText: location })
            .getByRole("button", { name: "Archive" })
            .click();
    }
    await page
        .getByRole("link", { name: /Scrolling Skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    const emptyLocationDialog = await openJumpItemSelect(page, "Location");
    await expect(
        emptyLocationDialog.getByText("No location available."),
    ).toBeVisible();
    await expect(
        emptyLocationDialog.getByRole("radio", { name: "None" }),
    ).toHaveCount(0);
    await emptyLocationDialog.getByRole("button", { name: "Close" }).click();
    await page
        .getByRole("link", { name: /Scrolling Skydiver's logbook/ })
        .click();

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
        await selectJumpItems(page, "Location", ["Scroll Drop Zone"]);
        await selectJumpItems(page, "Aircraft", ["Scroll Plane"]);
        await page.getByRole("button", { name: "Add jump" }).click();
    }

    await page.goto("/logbook");
    await expect(page.getByRole("link", { name: /#\d+/ })).toHaveCount(24);
    const scrollToTop = page.getByRole("button", { name: "Scroll to top" });
    await expect(scrollToTop).toBeHidden();
    const loadMore = page.getByText("Loading more jumps...");
    await loadMore.scrollIntoViewIfNeeded();
    await expect(page.getByRole("link", { name: /#\d+/ })).toHaveCount(25);
    await expect(page.getByRole("link", { name: /^#1 / })).toBeVisible();
    await expect(loadMore).toHaveCount(0);
    await expect(scrollToTop).toBeVisible();
    await scrollToTop.click();
    await expect.poll(async () => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(scrollToTop).toBeHidden();

    const searchInput = page.getByRole("searchbox", { name: "Search jumps" });
    await searchInput.fill("2");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(/search=2/);
    await expect(page.getByRole("link", { name: /^#2 / })).toHaveCount(1);
    await expect(
        page.getByRole("button", { name: "Search", exact: true }),
    ).toHaveAttribute("data-loki-tooltip", "Search · default action on Enter");
    await page.getByRole("link", { name: "Clear search" }).click();
    await expect(page).not.toHaveURL(/search=/);
    await expect(searchInput).toHaveValue("");

    await searchInput.fill("1");
    await page.getByRole("button", { name: "Go to jump number" }).click();
    await expectLogbookAroundJump(page, 1);
    await expect(searchInput).toHaveValue("1");
    await page.getByRole("link", { name: "Clear search" }).click();
    await expect(page).not.toHaveURL(/[?&](search|offset|goto)=/);
    await expect(page).not.toHaveURL(/#jump-/);
    await expect(searchInput).toHaveValue("");
});

test("truncated jump notes can be fully shown", async ({ page }) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("long-jump-notes");
    await page.locator('input[name="displayName"]').fill("Long Jump Notes");
    await page.locator('input[name="email"]').fill("long-notes@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    const longNotes = "These are long jump notes. ".repeat(20);
    await page.locator('textarea[name="description"]').fill(longNotes);
    await page.getByRole("button", { name: "Add jump" }).click();

    const card = page.getByRole("listitem").filter({
        has: page.getByRole("link", { name: /#1/ }),
    });
    const notes = card.getByText(longNotes);
    const showAll = card.getByRole("button", { name: "Show all" });
    await expect(showAll).toBeVisible();
    await expect(notes).toHaveClass(/line-clamp-2/);

    await showAll.click();
    await expectLogbookAroundJump(page, 1);
    await expect(notes).not.toHaveClass(/line-clamp-2/);
    await expect(showAll).toBeHidden();
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
    await page.locator('textarea[name="description"]').fill("Primary rig");
    await page.locator('input[name="previousCount"]').fill("12");
    await page.getByRole("button", { name: "Add gear" }).click();
    await expect(page).toHaveURL("/logbook");

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
    await page
        .locator('textarea[name="description"]')
        .fill("Horizontal flight");
    await page.locator('input[name="previousCount"]').fill("4");
    await page.getByRole("button", { name: "Add jump type" }).click();
    await expect(page).toHaveURL("/logbook");

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page.getByRole("link", { name: "Add location" }).click();
    await page.locator('input[name="name"]').fill("Skydive Test Center");
    await page.locator('textarea[name="description"]').fill("Home drop zone");
    await page.locator('input[name="previousCount"]').fill("50");
    await page.getByRole("button", { name: "Add location" }).click();
    await expect(page).toHaveURL("/logbook");

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Cessna 182" })
        .getByRole("link", { name: "Edit" })
        .click();
    await page.locator('input[name="previousCount"]').fill("25");
    await page.getByRole("button", { name: "Save aircraft" }).click();
    await expect(page).toHaveURL("/logbook");

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator("[data-loki-jump-date-input]").fill("2024-06-15");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await expect(
        page.getByRole("status", { name: "Freefall distance" }),
    ).toHaveText(/3\s000 m/);
    await page.locator('input[name="freefallTime"]').fill("55");
    await selectJumpItems(page, "Location", ["Skydive Test Center"]);
    const aircraftDialog = await openJumpItemSelect(page, "Aircraft");
    await expect(
        aircraftDialog.getByText(
            'Multiple aircraft can be selected, so aircraft types and registration numbers can be tracked individually. For example, "Caravan" and "OH-DZF".',
        ),
    ).toBeVisible();
    await expect(
        aircraftDialog.getByText(
            "Aircraft can be edited on the Manage aircraft page.",
        ),
    ).toBeVisible();
    await expect(
        aircraftDialog.getByRole("link", { name: "Manage aircraft" }),
    ).toHaveAttribute("href", "/logbook/aircrafts");
    await aircraftDialog.getByLabel("Cessna 182", { exact: true }).hover();
    await expect(page.getByRole("tooltip")).toHaveText("Aircraft type");
    await expect(page.getByRole("tooltip")).toBeVisible();
    await aircraftDialog.getByRole("button", { name: "OK" }).click();
    await selectJumpItems(page, "Aircraft", ["Cessna 182", "OH-DZF"]);
    const selectedAircraftDialog = await openJumpItemSelect(page, "Aircraft");
    const clearAircraft = selectedAircraftDialog.getByText("Clear all", {
        exact: true,
    });
    await expect(clearAircraft).toBeEnabled();
    const jumpForm = page.locator('form[data-loki-confirm="Add Jump"]');
    await resetFormDirtyForTest(jumpForm);
    await clearAircraft.click();
    await expect(
        selectedAircraftDialog.getByLabel("Cessna 182", { exact: true }),
    ).not.toBeChecked();
    await expect(
        selectedAircraftDialog.getByLabel("OH-DZF", { exact: true }),
    ).not.toBeChecked();
    await expect(clearAircraft).toBeDisabled();
    await expect(jumpItemSummary(page, "Aircraft")).toHaveText("None selected");
    await expect(jumpForm).toHaveAttribute("data-loki-form-dirty", "true");
    await selectedAircraftDialog.getByRole("button", { name: "OK" }).click();
    await selectJumpItems(page, "Aircraft", ["Cessna 182", "OH-DZF"]);
    await selectJumpItems(page, "Gear used", ["Main canopy"]);
    const jumpTypeDialog = await openJumpItemSelect(page, "Jump types");
    await expect(
        jumpTypeDialog.getByText(
            "Multiple jump types can be selected, so roles such as load organizer can be tracked on a wingsuit jump. Jump types can also be used to track cutaways and similar events.",
        ),
    ).toBeVisible();
    await jumpTypeDialog.getByRole("button", { name: "OK" }).click();
    await selectJumpItems(page, "Jump types", ["Freefly", "Tracking"]);
    await page.locator('textarea[name="description"]').fill("First test jump");
    await page.getByRole("button", { name: "Add jump" }).click();

    await expectLogbookAroundJump(page, 1);
    await expect(
        page.getByRole("heading", { name: "1 Jumps", level: 1 }),
    ).toBeVisible();
    const firstJump = page
        .getByRole("listitem")
        .filter({ has: page.getByRole("link", { name: /#1/ }) });
    await expect(firstJump).toContainText("Skydive Test Center");
    await expect(firstJump).toContainText("Cessna 182, OH-DZF");
    await expect(firstJump).toContainText("Gear: Main canopy");
    await expect(
        firstJump.getByText("Skydive Test Center", { exact: true }),
    ).toHaveAttribute("data-loki-tooltip", "Home drop zone");
    await expect(
        firstJump.getByText("Cessna 182", { exact: true }),
    ).toHaveAttribute("data-loki-tooltip", "Aircraft type");
    await expect(
        firstJump.getByText("Tracking", { exact: true }),
    ).toHaveAttribute("data-loki-tooltip", "Horizontal flight");
    await expect(
        firstJump.getByText("Main canopy", { exact: true }),
    ).toHaveAttribute("data-loki-tooltip", "Primary rig");
    await expect(page.getByText("First test jump")).toBeVisible();
    await expect(page.getByText(/4\s000 m/, { exact: true })).toBeVisible();
    await expect(page.getByText(/1\s000 m/, { exact: true })).toBeVisible();
    await expect(firstJump.getByText("55s", { exact: true })).toBeVisible();
    await expect(firstJump.getByText("Freefly")).toBeVisible();
    await expect(firstJump.getByText("Tracking")).toBeVisible();

    const startDate = page.getByRole("textbox", { name: "Start date" });
    if (!(await startDate.isVisible())) {
        await page.getByText("Filters", { exact: true }).click();
    }
    await startDate.fill("2024-06-15");
    await page.getByRole("textbox", { name: "End date" }).fill("2024-06-15");
    await selectJumpItems(page, "Jump types", ["Freefly", "Tracking"]);
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/\/logbook\?.*jumpTypeUuids=/);
    await expect(page).toHaveURL(/start=2024-06-15/);
    await expect(page).toHaveURL(/end=2024-06-15/);
    await expect(page.getByRole("link", { name: /#1/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /#2/ })).toHaveCount(0);

    await page.getByRole("link", { name: /#1/ }).click();
    await expect(jumpItemSummary(page, "Location")).toContainText(
        "Skydive Test Center",
    );
    await expect(jumpItemSummary(page, "Aircraft")).toContainText("Cessna 182");
    await page.getByRole("link", { name: "Copy to new" }).click();

    await expect(page).toHaveURL(/\/logbook\/jumps\/new\?from=/);
    await expect(page.locator('input[name="jumpNumber"]')).toHaveValue("2");
    await expect(page.locator("[data-loki-jump-date-input]")).toHaveValue(
        "2024-06-15",
    );
    const datePicker = page.locator("[data-loki-jump-date-picker]");
    await datePicker.evaluate((element) => {
        if (!(element instanceof HTMLInputElement)) {
            throw new Error("Expected date input");
        }
        element.showPicker = () => {
            element.dataset.lokiOpened = "true";
        };
    });
    await page.getByRole("button", { name: "Choose jump date" }).click();
    await expect(datePicker).toHaveAttribute("data-loki-opened", "true");
    await datePicker.evaluate((element) => {
        if (!(element instanceof HTMLInputElement)) {
            throw new Error("Expected date input");
        }
        element.value = "2024-06-16";
        element.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(page.locator("[data-loki-jump-date-input]")).toHaveValue(
        "2024-06-16",
    );
    await page.getByRole("button", { name: "Today" }).click();
    const today = new Date();
    const todayValue = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
    ].join("-");
    await expect(page.locator("[data-loki-jump-date-input]")).toHaveValue(
        todayValue,
    );
    await page.locator("[data-loki-jump-date-input]").fill("2024-06-15");
    await expect(page.locator('input[name="exitAltitude"]')).toHaveValue(
        "4000",
    );
    await expect(page.locator('input[name="openingAltitude"]')).toHaveValue(
        "1000",
    );
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("55");
    await expect(jumpItemSummary(page, "Location")).toContainText(
        "Skydive Test Center",
    );
    await expect(jumpItemSummary(page, "Aircraft")).toContainText("Cessna 182");
    await expect(jumpItemSummary(page, "Gear used")).toContainText(
        "Main canopy",
    );
    await expect(jumpItemSummary(page, "Jump types")).toContainText("Freefly");
    await expect(jumpItemSummary(page, "Jump types")).toContainText("Tracking");
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "First test jump",
    );
    await page.getByRole("button", { name: "Add jump" }).click();

    await expectLogbookAroundJump(page, 2);
    const secondJump = page.getByRole("link", { name: /#2/ });
    await expect(secondJump).toContainText("Skydive Test Center");
    await expect(secondJump).toContainText("Cessna 182");

    await page.getByRole("link", { name: "Add jump", exact: true }).click();

    await expect(page).toHaveURL("/logbook/jumps/new");
    await expect(page.locator('input[name="jumpNumber"]')).toHaveValue("3");
    await expect(page.locator("[data-loki-jump-date-input]")).toHaveValue(
        "2024-06-15",
    );
    await expect(page.locator('input[name="exitAltitude"]')).toHaveValue(
        "4000",
    );
    await expect(page.locator('input[name="openingAltitude"]')).toHaveValue(
        "1000",
    );
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("55");
    await expect(jumpItemSummary(page, "Location")).toContainText(
        "Skydive Test Center",
    );
    await expect(jumpItemSummary(page, "Aircraft")).toContainText("Cessna 182");
    await expect(jumpItemSummary(page, "Gear used")).toContainText(
        "Main canopy",
    );
    await expect(jumpItemSummary(page, "Jump types")).toContainText("Freefly");
    await expect(jumpItemSummary(page, "Jump types")).toContainText("Tracking");
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "First test jump",
    );

    await page.getByRole("link", { name: /Test Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page
        .getByRole("listitem")
        .filter({ has: page.getByText("Main canopy", { exact: true }) })
        .getByRole("link", { name: "Edit" })
        .click();
    await page.locator('input[name="name"]').fill("Main canopy updated");
    await page.locator('input[name="previousCount"]').fill("15");
    await page.locator('textarea[name="description"]').fill("Updated gear");
    await page.getByRole("button", { name: "Save gear" }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Main canopy updated" })
        .getByRole("link", { name: "Edit" })
        .click();
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
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage jump types" }).click();
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
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage jump types" }).click();
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
    await page
        .getByRole("listitem")
        .filter({ hasText: "Skydive Test Center" })
        .getByRole("link", { name: "Edit" })
        .click();
    await page.locator('input[name="name"]').fill("Skydive Updated Center");
    await page.locator('input[name="previousCount"]').fill("55");
    await page.locator('textarea[name="description"]').fill("Updated location");
    await page.getByRole("button", { name: "Save location" }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Skydive Updated Center" })
        .getByRole("link", { name: "Edit" })
        .click();
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
    await page
        .getByRole("listitem")
        .filter({ hasText: "Cessna 182" })
        .getByRole("link", { name: "Edit" })
        .click();
    await page.locator('input[name="name"]').fill("Cessna 182 updated");
    await page.locator('input[name="previousCount"]').fill("30");
    await page.locator('textarea[name="description"]').fill("Updated aircraft");
    await page.getByRole("button", { name: "Save aircraft" }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Cessna 182 updated" })
        .getByRole("link", { name: "Edit" })
        .click();
    await expect(page.locator('input[name="name"]')).toHaveValue(
        "Cessna 182 updated",
    );
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
        .filter({ hasText: "Cessna 182 updated" })
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
    // Prefill from the previous jump keeps archived selections visible.
    await expect(jumpItemSummary(page, "Location")).toContainText(
        "Skydive Updated Center",
    );
    await expect(jumpItemSummary(page, "Aircraft")).toContainText(
        "Cessna 182 updated",
    );
    await expect(jumpItemSummary(page, "Gear used")).toContainText(
        "Main canopy updated",
    );
    await expect(jumpItemSummary(page, "Jump types")).toContainText(
        "Freefly updated",
    );

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
    await expect(jumpItemSummary(page, "Gear used")).toContainText(
        "Main canopy updated",
    );
});

test("a jump can be added without measurements or jump items", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("optional-jump-fields");
    await page.locator('input[name="displayName"]').fill("Optional fields");
    await page
        .locator('input[name="email"]')
        .fill("optional-jump-fields@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await expect(page.locator('input[name="exitAltitude"]')).toHaveValue("");
    await expect(page.locator('input[name="openingAltitude"]')).toHaveValue("");
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("");
    await page.getByRole("button", { name: "Add jump" }).click();

    await expectLogbookAroundJump(page, 1);
    await expect(page.getByRole("link", { name: /#1/ })).toBeVisible();

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await expect(page.locator('input[name="exitAltitude"]')).toHaveValue("");
    await expect(page.locator('input[name="openingAltitude"]')).toHaveValue("");
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("");
    await page.getByRole("button", { name: "Add jump" }).click();

    await expectLogbookAroundJump(page, 2);
    await expect(page.getByRole("link", { name: /#2/ })).toBeVisible();
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
    await selectJumpItems(page, "Location", ["Conversion location"]);
    await selectJumpItems(page, "Aircraft", ["Conversion aircraft"]);
    await selectJumpItems(page, "Gear used", ["Convertible gear"]);
    await page.getByRole("button", { name: "Add jump" }).click();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Convertible gear" })
        .getByRole("link", { name: "Edit" })
        .click();
    await openDangerZone(page);
    const convertForm = page.locator("form").filter({
        has: page.locator('input[name="action"][value="convertToJumpType"]'),
    });
    const convertButton = convertForm.getByRole("button");
    await expect(convertButton).toHaveText("Convert to jump type");
    await convertButton.click();
    await expect(convertButton).toHaveText("Confirm convert", {
        timeout: 1000,
    });
    await convertButton.click();
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
    await expect(jumpItemSummary(page, "Jump types")).toContainText(
        "Convertible gear",
    );
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
    await page.locator("[data-loki-jump-date-input]").fill("2024-07-01");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await page.locator('input[name="locationName"]').fill("Inline Drop Zone");
    await page
        .locator('input[name="aircraftName"]')
        .fill("Inline Plane; Inline Helicopter");
    await page
        .locator('input[name="gearName"]')
        .fill("Inline Canopy; Inline Rig");
    await page
        .locator('input[name="jumpTypeName"]')
        .fill("Inline Tracking; Inline Camera");
    await page.getByRole("button", { name: "Add jump" }).click();

    await expectLogbookAroundJump(page, 1);
    const jump = page.getByRole("link", { name: /#1/ });
    await expect(jump).toContainText("Inline Drop Zone");
    await expect(jump).toContainText("Inline Helicopter, Inline Plane");
    await expect(
        page.getByRole("link", { name: /#1/ }).getByText("Inline Tracking"),
    ).toBeVisible();

    await page.getByRole("link", { name: /#1/ }).click();
    await expect(jumpItemSummary(page, "Location")).toContainText(
        "Inline Drop Zone",
    );
    await expect(jumpItemSummary(page, "Aircraft")).toContainText(
        "Inline Plane",
    );
    await expect(jumpItemSummary(page, "Aircraft")).toContainText(
        "Inline Helicopter",
    );
    await expect(jumpItemSummary(page, "Gear used")).toContainText(
        "Inline Canopy",
    );
    await expect(jumpItemSummary(page, "Gear used")).toContainText(
        "Inline Rig",
    );
    await expect(jumpItemSummary(page, "Jump types")).toContainText(
        "Inline Tracking",
    );
    await expect(jumpItemSummary(page, "Jump types")).toContainText(
        "Inline Camera",
    );

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
    await selectJumpItems(page, "Location", ["Next Number Drop Zone"]);
    await selectJumpItems(page, "Aircraft", ["Next Number Plane"]);
    await page.getByRole("button", { name: "Add jump" }).click();
    await expectLogbookAroundJump(page, 5);

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await expect(page.locator('input[name="jumpNumber"]')).toHaveValue("6");
    await expect(page.locator('input[name="jumpNumber"]')).toHaveAttribute(
        "data-loki-next-jump-number",
        "6",
    );

    await page.locator('input[name="jumpNumber"]').fill("99");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.locator('input[name="jumpNumber"]')).toHaveValue("6");
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
    await expect(
        page.getByRole("status", { name: "Average speed" }),
    ).toHaveText("180 km/h");

    await page.getByRole("button", { name: "Estimate" }).click();
    await page.getByRole("button", { name: "Freefly · 240 km/h" }).click();
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("45");
    await expect(
        page.getByRole("status", { name: "Average speed" }),
    ).toHaveText("240 km/h");

    await page.getByRole("button", { name: "Estimate" }).click();
    await page.getByRole("button", { name: "Wingsuit · 80 km/h" }).click();
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("135");
    await expect(
        page.getByRole("status", { name: "Average speed" }),
    ).toHaveText("80 km/h");
});

test("freefall time estimate respects feet altitude units", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("estimate-freefall-ft");
    await page
        .locator('input[name="displayName"]')
        .fill("Feet Estimate Jumper");
    await page
        .locator('input[name="email"]')
        .fill("estimate-freefall-ft@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await openMainMenu(page);
    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await page.locator('select[name="altitudeUnits"]').selectOption("feet");
    await page
        .locator('select[name="speedUnits"]')
        .selectOption("meters-per-second");
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page).toHaveURL("/logbook");

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await expect(page.getByText("Exit altitude (ft)")).toBeVisible();
    // 13123 ft ≈ 4000 m, 3281 ft ≈ 1000 m → ~3000 m freefall
    await page.locator('input[name="exitAltitude"]').fill("13123");
    await page.locator('input[name="openingAltitude"]').fill("3281");
    await expect(
        page.getByRole("status", { name: "Freefall distance" }),
    ).toHaveText(/9\s842 ft/);

    await page.getByRole("button", { name: "Estimate" }).click();
    await page.getByRole("button", { name: "Belly · 50 m/s" }).click();
    // 3000 m at 50 m/s = 60 s (without feet conversion this would be ~197 s)
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("60");
    await expect(
        page.getByRole("status", { name: "Average speed" }),
    ).toHaveText("50 m/s");

    await page.getByRole("button", { name: "Estimate" }).click();
    await page.getByRole("button", { name: "Freefly · 66,7 m/s" }).click();
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("45");
    await expect(
        page.getByRole("status", { name: "Average speed" }),
    ).toHaveText("66,7 m/s");

    await page.getByRole("button", { name: "Estimate" }).click();
    await page.getByLabel("Custom speed (m/s)").fill("40");
    await page.getByRole("button", { name: "Use custom speed" }).click();
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("75");
    await expect(
        page.getByRole("status", { name: "Average speed" }),
    ).toHaveText("40 m/s");

    await page.reload();
    await page.getByRole("button", { name: "Estimate" }).click();
    await expect(page.getByLabel("Custom speed (m/s)")).toHaveValue("40");
});

test("freefall time can be estimated with custom speed", async ({ page }) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("estimate-custom-speed");
    await page.locator('input[name="displayName"]').fill("Custom Speed Jumper");
    await page
        .locator('input[name="email"]')
        .fill("estimate-custom-speed@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");

    await page.getByRole("button", { name: "Estimate" }).click();
    await page.getByLabel("Custom speed (km/h)").fill("120");
    await page.getByRole("button", { name: "Use custom speed" }).click();
    // 3000 m at 120 km/h = 33.3 m/s → 90 s
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("90");
    await expect(
        page.getByRole("status", { name: "Average speed" }),
    ).toHaveText("120 km/h");

    await page.reload();
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.getByRole("button", { name: "Estimate" }).click();
    await expect(page.getByLabel("Custom speed (km/h)")).toHaveValue("120");
});
