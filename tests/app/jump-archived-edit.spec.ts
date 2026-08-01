import { acceptPrivacyPolicyIfRequired } from "./helpers";
import { expect, test } from "./fixtures";
import {
    expectLogbookAroundJump,
    jumpItemSummary,
    openJumpItemSelect,
    openManageLogbook,
    selectJumpItems,
} from "./helpers";

// eslint-disable-next-line max-lines-per-function
test("editing a jump keeps archived jump items", async ({ page }) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("archived-edit-skydiver");
    await page
        .locator('input[name="displayName"]')
        .fill("Archived Edit Skydiver");
    await page
        .locator('input[name="email"]')
        .fill("archived-edit@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await acceptPrivacyPolicyIfRequired(page);

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page.getByRole("link", { name: "Add location" }).click();
    await page.locator('input[name="name"]').fill("Archived Dropzone");
    await page.getByRole("button", { name: "Add location" }).click();

    await page
        .getByRole("link", { name: /Archived Edit Skydiver's logbook/ })
        .click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page.getByRole("link", { name: "Add aircraft" }).click();
    await page.locator('input[name="name"]').fill("Archived Plane");
    await page.getByRole("button", { name: "Add aircraft" }).click();

    await page
        .getByRole("link", { name: /Archived Edit Skydiver's logbook/ })
        .click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page.getByRole("link", { name: "Add gear" }).click();
    await page.locator('input[name="name"]').fill("Archived Canopy");
    await page
        .locator('textarea[name="description"]')
        .fill("Archived canopy description");
    await page.getByRole("button", { name: "Add gear" }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page.getByRole("link", { name: "Add gear" }).click();
    await page.locator('input[name="name"]').fill("Unused Archived Gear");
    await page.getByRole("button", { name: "Add gear" }).click();

    await page
        .getByRole("link", { name: /Archived Edit Skydiver's logbook/ })
        .click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage jump types" }).click();
    await page.getByRole("link", { name: "Add jump type" }).click();
    await page.locator('input[name="name"]').fill("Archived Freefly");
    await page.getByRole("button", { name: "Add jump type" }).click();

    await page
        .getByRole("link", { name: /Archived Edit Skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await selectJumpItems(page, "Location", ["Archived Dropzone"]);
    await selectJumpItems(page, "Aircraft", ["Archived Plane"]);
    await selectJumpItems(page, "Gear used", ["Archived Canopy"]);
    await selectJumpItems(page, "Jump types", ["Archived Freefly"]);
    await page
        .locator('textarea[name="description"]')
        .fill("Jump with items to archive");
    await page.getByRole("button", { name: "Add jump" }).click();

    for (const [manageLink, itemName] of [
        ["Manage locations", "Archived Dropzone"],
        ["Manage aircraft", "Archived Plane"],
        ["Manage gear", "Archived Canopy"],
        ["Manage gear", "Unused Archived Gear"],
        ["Manage jump types", "Archived Freefly"],
    ] as const) {
        await openManageLogbook(page);
        await page.getByRole("link", { name: manageLink }).click();
        await page
            .getByRole("listitem")
            .filter({ hasText: itemName })
            .getByRole("button", { name: "Archive" })
            .click();
        await page
            .getByRole("link", { name: /Archived Edit Skydiver's logbook/ })
            .click();
    }

    await page.getByRole("link", { name: /#1/ }).click();
    await expect(jumpItemSummary(page, "Location")).toContainText(
        "Archived Dropzone",
    );
    await expect(jumpItemSummary(page, "Aircraft")).toContainText(
        "Archived Plane",
    );
    await expect(jumpItemSummary(page, "Gear used")).toContainText(
        "Archived Canopy",
    );
    await expect(jumpItemSummary(page, "Jump types")).toContainText(
        "Archived Freefly",
    );
    await expect(
        page.locator('[data-loki-archived="true"]', {
            hasText: "Unused Archived Gear",
        }),
    ).toBeHidden();
    const gearDialog = await openJumpItemSelect(page, "Gear used");
    await expect(
        gearDialog.getByRole("heading", { name: "Archived" }),
    ).toBeVisible();
    await expect(
        gearDialog.locator(
            'label[data-loki-tooltip="Archived canopy description"]',
        ),
    ).toContainText("Archived Canopy");
    await expect(
        jumpItemSummary(page, "Gear used").locator(
            '[data-loki-tooltip="Archived canopy description"]',
        ),
    ).toContainText("Archived Canopy");
    await expect(gearDialog.getByRole("button", { name: "OK" })).toBeVisible();
    await expect(
        gearDialog.getByRole("button", { name: "Show archived items" }),
    ).toBeVisible();
    await gearDialog
        .getByRole("button", { name: "Show archived items" })
        .click();
    await expect(
        page.getByRole("checkbox", {
            name: "Unused Archived Gear",
        }),
    ).toBeVisible();
    await expect(
        gearDialog.getByRole("button", { name: "Hide archived items" }),
    ).toBeVisible();
    await gearDialog
        .getByRole("button", { name: "Hide archived items" })
        .click();
    await expect(
        page.locator('[data-loki-archived="true"]', {
            hasText: "Unused Archived Gear",
        }),
    ).toBeHidden();
    await expect(jumpItemSummary(page, "Gear used")).toContainText(
        "Archived Canopy",
    );
    await expect(
        gearDialog.getByRole("button", { name: "Show archived items" }),
    ).toBeVisible();
    await gearDialog.getByRole("button", { name: "OK" }).click();

    await page
        .locator('textarea[name="description"]')
        .fill("Edited while items archived");
    await page.getByRole("button", { name: "Save jump" }).click();
    await expectLogbookAroundJump(page, 1);
    await expect(page.getByText("Edited while items archived")).toBeVisible();

    await page.getByRole("link", { name: /#1/ }).click();
    await expect(jumpItemSummary(page, "Location")).toContainText(
        "Archived Dropzone",
    );
    await expect(jumpItemSummary(page, "Aircraft")).toContainText(
        "Archived Plane",
    );
    await expect(jumpItemSummary(page, "Gear used")).toContainText(
        "Archived Canopy",
    );
    await expect(jumpItemSummary(page, "Jump types")).toContainText(
        "Archived Freefly",
    );
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "Edited while items archived",
    );
});

// eslint-disable-next-line max-lines-per-function
test("new jump form hides archived items and shows reveal button", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page
        .locator('input[name="username"]')
        .fill("archived-new-jump-skydiver");
    await page
        .locator('input[name="displayName"]')
        .fill("Archived New Jump Skydiver");
    await page
        .locator('input[name="email"]')
        .fill("archived-new-jump@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await acceptPrivacyPolicyIfRequired(page);

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page.getByRole("link", { name: "Add location" }).click();
    await page.locator('input[name="name"]').fill("Active Dropzone");
    await page.getByRole("button", { name: "Add location" }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page.getByRole("link", { name: "Add location" }).click();
    await page.locator('input[name="name"]').fill("Hidden Dropzone");
    await page.getByRole("button", { name: "Add location" }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Hidden Dropzone" })
        .getByRole("button", { name: "Archive" })
        .click();

    await page
        .getByRole("link", { name: /Archived New Jump Skydiver's logbook/ })
        .click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page.getByRole("link", { name: "Add aircraft" }).click();
    await page.locator('input[name="name"]').fill("Active Plane");
    await page.getByRole("button", { name: "Add aircraft" }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page.getByRole("link", { name: "Add aircraft" }).click();
    await page.locator('input[name="name"]').fill("Hidden Plane");
    await page.getByRole("button", { name: "Add aircraft" }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Hidden Plane" })
        .getByRole("button", { name: "Archive" })
        .click();

    await page
        .getByRole("link", { name: /Archived New Jump Skydiver's logbook/ })
        .click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page.getByRole("link", { name: "Add gear" }).click();
    await page.locator('input[name="name"]').fill("Active Canopy");
    await page.getByRole("button", { name: "Add gear" }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page.getByRole("link", { name: "Add gear" }).click();
    await page.locator('input[name="name"]').fill("Hidden Canopy");
    await page.getByRole("button", { name: "Add gear" }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Hidden Canopy" })
        .getByRole("button", { name: "Archive" })
        .click();

    await page
        .getByRole("link", { name: /Archived New Jump Skydiver's logbook/ })
        .click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage jump types" }).click();
    await page.getByRole("link", { name: "Add jump type" }).click();
    await page.locator('input[name="name"]').fill("Hidden Freefly");
    await page.getByRole("button", { name: "Add jump type" }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage jump types" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Hidden Freefly" })
        .getByRole("button", { name: "Archive" })
        .click();

    await page
        .getByRole("link", { name: /Archived New Jump Skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();

    await expect(jumpItemSummary(page, "Location")).toHaveText("None selected");
    await expect(jumpItemSummary(page, "Aircraft")).toHaveText("None selected");
    const locationDialog = await openJumpItemSelect(page, "Location");
    await expect(
        locationDialog.getByRole("radio", {
            name: "Active Dropzone",
            exact: true,
        }),
    ).toBeVisible();
    await expect(
        locationDialog.locator('label[data-loki-archived="true"][hidden]', {
            hasText: "Hidden Dropzone",
        }),
    ).toBeAttached();
    await locationDialog.getByRole("button", { name: "Close" }).click();

    const aircraftDialog = await openJumpItemSelect(page, "Aircraft");
    await expect(
        aircraftDialog.getByRole("checkbox", {
            name: "Active Plane",
            exact: true,
        }),
    ).toBeVisible();
    await expect(
        aircraftDialog.locator('label[data-loki-archived="true"][hidden]', {
            hasText: "Hidden Plane",
        }),
    ).toBeAttached();
    await aircraftDialog.getByRole("button", { name: "Close" }).click();

    const gearDialog = await openJumpItemSelect(page, "Gear used");
    await expect(
        gearDialog.getByRole("checkbox", {
            name: "Active Canopy",
            exact: true,
        }),
    ).toBeVisible();
    await expect(
        gearDialog.locator('label[data-loki-archived="true"][hidden]', {
            hasText: "Hidden Canopy",
        }),
    ).toBeAttached();
    await expect(
        gearDialog.getByRole("heading", { name: "Archived" }),
    ).toBeHidden();
    await expect(
        page.locator('label[data-loki-archived="true"][hidden]', {
            hasText: "Hidden Freefly",
        }),
    ).toBeAttached();
    await expect(
        gearDialog.getByRole("button", { name: "Show archived items" }),
    ).toBeVisible();

    await gearDialog
        .getByRole("button", { name: "Show archived items" })
        .click();
    await expect(
        gearDialog.getByRole("heading", { name: "Archived" }),
    ).toBeVisible();
    await expect(
        page.getByRole("checkbox", { name: "Hidden Canopy" }),
    ).toBeVisible();
    await expect(
        gearDialog.getByRole("button", { name: "Hide archived items" }),
    ).toBeVisible();
    await gearDialog
        .getByRole("button", { name: "Hide archived items" })
        .click();
    await expect(
        page.locator('label[data-loki-archived="true"][hidden]', {
            hasText: "Hidden Canopy",
        }),
    ).toBeAttached();
    await expect(
        gearDialog.getByRole("button", { name: "Show archived items" }),
    ).toBeVisible();
});
