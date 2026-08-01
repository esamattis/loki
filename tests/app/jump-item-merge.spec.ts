import { acceptPrivacyPolicyIfRequired } from "./helpers";
import { expect, test, type Page } from "./fixtures";
import {
    expectLogbookAroundJump,
    openDangerZone,
    openManageLogbook,
    selectJumpItems,
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

async function addItem(
    page: Page,
    item: {
        manageLink: string;
        addLabel: string;
        name: string;
        previousCount?: string;
    },
) {
    await openManageLogbook(page);
    await page.getByRole("link", { name: item.manageLink }).click();
    await page.getByRole("link", { name: item.addLabel }).click();
    await page.locator('input[name="name"]').fill(item.name);
    if (item.previousCount !== undefined) {
        await page
            .locator('input[name="previousCount"]')
            .fill(item.previousCount);
    }
    await page.getByRole("button", { name: item.addLabel }).click();
}

async function goHome(page: Page, displayName: string) {
    await page
        .getByRole("link", { name: new RegExp(`${displayName}'s logbook`) })
        .click();
}

async function mergeItem(
    page: Page,
    item: {
        manageLink: string;
        sourceName: string;
        targetName: string;
        mergeButtonLabel: string;
    },
) {
    await openManageLogbook(page);
    await page.getByRole("link", { name: item.manageLink }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: item.sourceName })
        .getByRole("link", { name: "Edit" })
        .click();
    await openDangerZone(page);
    const mergeForm = page.locator("form").filter({
        has: page.locator('input[name="action"][value="merge"]'),
    });
    await mergeForm.locator('select[name="targetUuid"]').selectOption({
        label: item.targetName,
    });
    const mergeButton = mergeForm.getByRole("button");
    await expect(mergeButton).toHaveText(item.mergeButtonLabel);
    await mergeButton.click();
    await expect(mergeButton).toHaveText("Confirm merge", { timeout: 1000 });
    await mergeButton.click();
}

test("location can be merged into another location", async ({ page }) => {
    const displayName = "Merge Location Skydiver";
    await registerUser(page, "merge-location-skydiver", displayName);
    await addItem(page, {
        manageLink: "Manage locations",
        addLabel: "Add location",
        name: "Source DZ",
        previousCount: "3",
    });
    await goHome(page, displayName);
    await addItem(page, {
        manageLink: "Manage locations",
        addLabel: "Add location",
        name: "Target DZ",
        previousCount: "5",
    });
    await goHome(page, displayName);
    await addItem(page, {
        manageLink: "Manage aircraft",
        addLabel: "Add aircraft",
        name: "Merge Plane",
    });

    await goHome(page, displayName);
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await selectJumpItems(page, "Location", ["Source DZ"]);
    await selectJumpItems(page, "Aircraft", ["Merge Plane"]);
    await page.getByRole("button", { name: "Add jump" }).click();
    await expectLogbookAroundJump(page, 1);

    await mergeItem(page, {
        manageLink: "Manage locations",
        sourceName: "Source DZ",
        targetName: "Target DZ",
        mergeButtonLabel: "Merge location",
    });

    await expect(page).toHaveURL(/\/logbook\/locations\/[^/]+$/);
    await expect(page.locator('input[name="name"]')).toHaveValue("Target DZ");
    await expect(page.locator('input[name="previousCount"]')).toHaveValue("8");
    await expect(
        page.getByText("1 jumps in total", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Recent jumps at this location")).toBeVisible();
    await expect(page.getByRole("link", { name: /#1/ })).toBeVisible();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await expect(page.getByText("Source DZ", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Target DZ", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Previous jumps: 8")).toBeVisible();
    await expect(page.getByLabel("Recorded jumps: 1")).toBeVisible();
    await expect(page.getByLabel("Previous jumps: 8")).toHaveAttribute(
        "data-loki-tooltip",
        "The manually entered count of jumps at this location that are not stored as individual jump records.",
    );
    await expect(page.getByLabel("Recorded jumps: 1")).toHaveAttribute(
        "data-loki-tooltip",
        "The number of individual jump records assigned to this location.",
    );
});

test("aircraft can be merged into another aircraft", async ({ page }) => {
    const displayName = "Merge Aircraft Skydiver";
    await registerUser(page, "merge-aircraft-skydiver", displayName);
    await addItem(page, {
        manageLink: "Manage locations",
        addLabel: "Add location",
        name: "Merge DZ",
    });
    await goHome(page, displayName);
    await addItem(page, {
        manageLink: "Manage aircraft",
        addLabel: "Add aircraft",
        name: "Source Plane",
        previousCount: "2",
    });
    await goHome(page, displayName);
    await addItem(page, {
        manageLink: "Manage aircraft",
        addLabel: "Add aircraft",
        name: "Target Plane",
        previousCount: "4",
    });

    await goHome(page, displayName);
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await selectJumpItems(page, "Location", ["Merge DZ"]);
    await selectJumpItems(page, "Aircraft", ["Source Plane"]);
    await page.getByRole("button", { name: "Add jump" }).click();
    await expectLogbookAroundJump(page, 1);

    await mergeItem(page, {
        manageLink: "Manage aircraft",
        sourceName: "Source Plane",
        targetName: "Target Plane",
        mergeButtonLabel: "Merge aircraft",
    });

    await expect(page).toHaveURL(/\/logbook\/aircrafts\/[^/]+$/);
    await expect(page.locator('input[name="name"]')).toHaveValue(
        "Target Plane",
    );
    await expect(page.locator('input[name="previousCount"]')).toHaveValue("6");
    await expect(
        page.getByText("1 jumps in total", { exact: true }),
    ).toBeVisible();
    await expect(
        page.getByText("Recent jumps with this aircraft"),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /#1/ })).toBeVisible();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await expect(page.getByText("Source Plane", { exact: true })).toHaveCount(
        0,
    );
    await expect(page.getByText("Target Plane", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Previous jumps: 6")).toBeVisible();
    await expect(page.getByLabel("Recorded jumps: 1")).toBeVisible();
    await expect(page.getByLabel("Previous jumps: 6")).toHaveAttribute(
        "data-loki-tooltip",
        "The manually entered count of jumps with this aircraft that are not stored as individual jump records.",
    );
    await expect(page.getByLabel("Recorded jumps: 1")).toHaveAttribute(
        "data-loki-tooltip",
        "The number of individual jump records assigned to this aircraft.",
    );
});

test("gear can be merged into another gear item", async ({ page }) => {
    const displayName = "Merge Gear Skydiver";
    await registerUser(page, "merge-gear-skydiver", displayName);
    await addItem(page, {
        manageLink: "Manage locations",
        addLabel: "Add location",
        name: "Merge DZ",
    });
    await goHome(page, displayName);
    await addItem(page, {
        manageLink: "Manage aircraft",
        addLabel: "Add aircraft",
        name: "Merge Plane",
    });
    await goHome(page, displayName);
    await addItem(page, {
        manageLink: "Manage gear",
        addLabel: "Add gear",
        name: "Source Canopy",
        previousCount: "1",
    });
    await goHome(page, displayName);
    await addItem(page, {
        manageLink: "Manage gear",
        addLabel: "Add gear",
        name: "Target Canopy",
        previousCount: "7",
    });

    await goHome(page, displayName);
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await selectJumpItems(page, "Location", ["Merge DZ"]);
    await selectJumpItems(page, "Aircraft", ["Merge Plane"]);
    await selectJumpItems(page, "Gear used", ["Source Canopy"]);
    await page.getByRole("button", { name: "Add jump" }).click();
    await expectLogbookAroundJump(page, 1);

    await mergeItem(page, {
        manageLink: "Manage gear",
        sourceName: "Source Canopy",
        targetName: "Target Canopy",
        mergeButtonLabel: "Merge gear",
    });

    await expect(page).toHaveURL(/\/logbook\/gear\/[^/]+$/);
    await expect(page.locator('input[name="name"]')).toHaveValue(
        "Target Canopy",
    );
    await expect(page.locator('input[name="previousCount"]')).toHaveValue("8");
    await expect(
        page.getByText("1 jumps in total", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Recent jumps with this gear")).toBeVisible();
    await expect(page.getByRole("link", { name: /#1/ })).toBeVisible();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await expect(page.getByText("Source Canopy", { exact: true })).toHaveCount(
        0,
    );
    await expect(
        page.getByText("Target Canopy", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Previous uses: 8")).toBeVisible();
    await expect(page.getByLabel("Recorded jumps: 1")).toBeVisible();
    await expect(page.getByLabel("Previous uses: 8")).toHaveAttribute(
        "data-loki-tooltip",
        "The manually entered usage count for this gear that is not stored as individual jump records.",
    );
    await expect(page.getByLabel("Recorded jumps: 1")).toHaveAttribute(
        "data-loki-tooltip",
        "The number of individual jump records that use this gear.",
    );
});

test("jump type can be merged into another jump type", async ({ page }) => {
    const displayName = "Merge Jump Type Skydiver";
    await registerUser(page, "merge-jumptype-skydiver", displayName);
    await addItem(page, {
        manageLink: "Manage locations",
        addLabel: "Add location",
        name: "Merge DZ",
    });
    await goHome(page, displayName);
    await addItem(page, {
        manageLink: "Manage aircraft",
        addLabel: "Add aircraft",
        name: "Merge Plane",
    });
    await goHome(page, displayName);
    await addItem(page, {
        manageLink: "Manage jump types",
        addLabel: "Add jump type",
        name: "Source Type",
        previousCount: "2",
    });
    await goHome(page, displayName);
    await addItem(page, {
        manageLink: "Manage jump types",
        addLabel: "Add jump type",
        name: "Target Type",
        previousCount: "9",
    });

    await goHome(page, displayName);
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await selectJumpItems(page, "Location", ["Merge DZ"]);
    await selectJumpItems(page, "Aircraft", ["Merge Plane"]);
    await selectJumpItems(page, "Jump types", ["Source Type"]);
    await page.getByRole("button", { name: "Add jump" }).click();
    await expectLogbookAroundJump(page, 1);

    await mergeItem(page, {
        manageLink: "Manage jump types",
        sourceName: "Source Type",
        targetName: "Target Type",
        mergeButtonLabel: "Merge jump type",
    });

    await expect(page).toHaveURL(/\/logbook\/jump-types\/[^/]+$/);
    await expect(page.locator('input[name="name"]')).toHaveValue("Target Type");
    await expect(page.locator('input[name="previousCount"]')).toHaveValue("11");
    await expect(
        page.getByText("1 jumps in total", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Recent jumps of this type")).toBeVisible();
    await expect(page.getByRole("link", { name: /#1/ })).toBeVisible();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage jump types" }).click();
    await expect(page.getByText("Source Type", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Target Type", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Previous uses: 11")).toBeVisible();
    await expect(page.getByLabel("Recorded jumps: 1")).toBeVisible();
    await expect(page.getByLabel("Previous uses: 11")).toHaveAttribute(
        "data-loki-tooltip",
        "The manually entered usage count for this jump type that is not stored as individual jump records.",
    );
    await expect(page.getByLabel("Recorded jumps: 1")).toHaveAttribute(
        "data-loki-tooltip",
        "The number of individual jump records assigned this jump type.",
    );
});
