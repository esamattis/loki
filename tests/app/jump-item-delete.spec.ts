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
    item: { manageLink: string; addLabel: string; name: string },
) {
    await openManageLogbook(page);
    await page.getByRole("link", { name: item.manageLink }).click();
    await page.getByRole("link", { name: item.addLabel }).click();
    await page.locator('input[name="name"]').fill(item.name);
    await page.getByRole("button", { name: item.addLabel }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: item.manageLink }).click();
}

async function confirmDelete(page: Page, deleteLabel: string) {
    const button = page
        .locator("form")
        .filter({
            has: page.locator('input[name="action"][value="delete"]'),
        })
        .getByRole("button");
    await expect(button).toHaveText(deleteLabel);
    await button.click();
    await expect(button).toHaveText("Confirm delete", { timeout: 1000 });
    await button.click();
}

test("gear can be deleted from the edit view with a confirm countdown", async ({
    page,
}) => {
    await registerUser(
        page,
        "deleting-gear-skydiver",
        "Deleting Gear Skydiver",
    );
    await addItem(page, {
        manageLink: "Manage gear",
        addLabel: "Add gear",
        name: "Disappearing Canopy",
    });

    await page
        .getByRole("listitem")
        .filter({ hasText: "Disappearing Canopy" })
        .getByRole("link", { name: "Edit" })
        .click();
    await expect(page).toHaveURL(/\/logbook\/gear\/[^/]+$/);
    await openDangerZone(page);

    await confirmDelete(page, "Delete gear");

    await expect(page).toHaveURL("/logbook/gear");
    await expect(
        page.getByText("Disappearing Canopy", { exact: true }),
    ).toHaveCount(0);
});

test("jump types can be deleted from the edit view", async ({ page }) => {
    await registerUser(
        page,
        "deleting-type-skydiver",
        "Deleting Type Skydiver",
    );
    await addItem(page, {
        manageLink: "Manage jump types",
        addLabel: "Add jump type",
        name: "Disposable Jump Type",
    });

    await page
        .getByRole("listitem")
        .filter({ hasText: "Disposable Jump Type" })
        .getByRole("link", { name: "Edit" })
        .click();
    await openDangerZone(page);

    await confirmDelete(page, "Delete jump type");

    await expect(page).toHaveURL("/logbook/jump-types");
    await expect(
        page.getByText("Disposable Jump Type", { exact: true }),
    ).toHaveCount(0);
});

test("aircraft cannot be deleted while used by jumps", async ({ page }) => {
    await registerUser(
        page,
        "guarded-aircraft-skydiver",
        "Guarded Aircraft Skydiver",
    );
    await addItem(page, {
        manageLink: "Manage locations",
        addLabel: "Add location",
        name: "Guarded DZ",
    });
    await page
        .getByRole("link", { name: /Guarded Aircraft Skydiver's logbook/ })
        .click();
    await addItem(page, {
        manageLink: "Manage aircraft",
        addLabel: "Add aircraft",
        name: "Guarded Plane",
    });

    await page
        .getByRole("link", { name: /Guarded Aircraft Skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await selectJumpItems(page, "Location", ["Guarded DZ"]);
    await selectJumpItems(page, "Aircraft", ["Guarded Plane"]);
    await page.getByRole("button", { name: "Add jump" }).click();
    await expectLogbookAroundJump(page, 1);

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Guarded Plane" })
        .getByRole("link", { name: "Edit" })
        .click();
    await openDangerZone(page);

    await confirmDelete(page, "Delete aircraft");

    await expect(page).toHaveURL(/\/logbook\/aircrafts\/[^/]+$/);
    await openDangerZone(page);
    await expect(
        page.getByText(
            "Cannot delete an aircraft that is used by jumps. Archive it instead.",
        ),
    ).toBeVisible();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await expect(
        page.getByText("Guarded Plane", { exact: true }),
    ).toBeVisible();
});

test("aircraft can be deleted once no jumps use it", async ({ page }) => {
    await registerUser(
        page,
        "free-aircraft-skydiver",
        "Free Aircraft Skydiver",
    );
    await addItem(page, {
        manageLink: "Manage locations",
        addLabel: "Add location",
        name: "Free DZ",
    });
    await page
        .getByRole("link", { name: /Free Aircraft Skydiver's logbook/ })
        .click();
    await addItem(page, {
        manageLink: "Manage aircraft",
        addLabel: "Add aircraft",
        name: "Free Plane",
    });

    await page
        .getByRole("link", { name: /Free Aircraft Skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await selectJumpItems(page, "Location", ["Free DZ"]);
    await selectJumpItems(page, "Aircraft", ["Free Plane"]);
    await page.getByRole("button", { name: "Add jump" }).click();
    await expectLogbookAroundJump(page, 1);

    // Delete the jump first so the aircraft is no longer referenced.
    await page.getByRole("link", { name: /#1/ }).click();
    await expect(page).toHaveURL(/\/logbook\/jumps\//);
    await openDangerZone(page);
    const button = page
        .locator("form")
        .filter({
            has: page.locator('input[name="action"][value="delete"]'),
        })
        .getByRole("button");
    await expect(button).toHaveText("Delete jump");
    await button.click();
    await expect(button).toHaveText("Confirm delete", { timeout: 1000 });
    await button.click();
    await expect(page).toHaveURL("/logbook");

    // Now the aircraft can be deleted.
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Free Plane" })
        .getByRole("link", { name: "Edit" })
        .click();
    await openDangerZone(page);
    await confirmDelete(page, "Delete aircraft");

    await expect(page).toHaveURL("/logbook/aircrafts");
    await expect(page.getByText("Free Plane", { exact: true })).toHaveCount(0);
});

test("gear cannot be deleted while used by jumps", async ({ page }) => {
    await registerUser(page, "guarded-gear-skydiver", "Guarded Gear Skydiver");
    await addItem(page, {
        manageLink: "Manage locations",
        addLabel: "Add location",
        name: "Guarded DZ",
    });
    await page
        .getByRole("link", { name: /Guarded Gear Skydiver's logbook/ })
        .click();
    await addItem(page, {
        manageLink: "Manage aircraft",
        addLabel: "Add aircraft",
        name: "Guarded Plane",
    });

    await page
        .getByRole("link", { name: /Guarded Gear Skydiver's logbook/ })
        .click();
    await addItem(page, {
        manageLink: "Manage gear",
        addLabel: "Add gear",
        name: "Guarded Canopy",
    });

    await page
        .getByRole("link", { name: /Guarded Gear Skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await selectJumpItems(page, "Location", ["Guarded DZ"]);
    await selectJumpItems(page, "Aircraft", ["Guarded Plane"]);
    await selectJumpItems(page, "Gear used", ["Guarded Canopy"]);
    await page.getByRole("button", { name: "Add jump" }).click();
    await expectLogbookAroundJump(page, 1);

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Guarded Canopy" })
        .getByRole("link", { name: "Edit" })
        .click();
    await openDangerZone(page);

    await confirmDelete(page, "Delete gear");

    await expect(page).toHaveURL(/\/logbook\/gear\/[^/]+$/);
    await openDangerZone(page);
    await expect(
        page.getByText(
            "Cannot delete gear that is used by jumps. Archive it instead.",
        ),
    ).toBeVisible();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await expect(
        page.getByText("Guarded Canopy", { exact: true }),
    ).toBeVisible();
});

test("jump types cannot be deleted while used by jumps", async ({ page }) => {
    await registerUser(
        page,
        "guarded-jumptype-skydiver",
        "Guarded Jump Type Skydiver",
    );
    await addItem(page, {
        manageLink: "Manage locations",
        addLabel: "Add location",
        name: "Guarded DZ",
    });
    await page
        .getByRole("link", { name: /Guarded Jump Type Skydiver's logbook/ })
        .click();
    await addItem(page, {
        manageLink: "Manage aircraft",
        addLabel: "Add aircraft",
        name: "Guarded Plane",
    });

    await page
        .getByRole("link", { name: /Guarded Jump Type Skydiver's logbook/ })
        .click();
    await addItem(page, {
        manageLink: "Manage jump types",
        addLabel: "Add jump type",
        name: "Guarded Type",
    });

    await page
        .getByRole("link", { name: /Guarded Jump Type Skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await selectJumpItems(page, "Location", ["Guarded DZ"]);
    await selectJumpItems(page, "Aircraft", ["Guarded Plane"]);
    await selectJumpItems(page, "Jump types", ["Guarded Type"]);
    await page.getByRole("button", { name: "Add jump" }).click();
    await expectLogbookAroundJump(page, 1);

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage jump types" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Guarded Type" })
        .getByRole("link", { name: "Edit" })
        .click();
    await openDangerZone(page);

    await confirmDelete(page, "Delete jump type");

    await expect(page).toHaveURL(/\/logbook\/jump-types\/[^/]+$/);
    await openDangerZone(page);
    await expect(
        page.getByText(
            "Cannot delete a jump type that is used by jumps. Archive it instead.",
        ),
    ).toBeVisible();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage jump types" }).click();
    await expect(page.getByText("Guarded Type", { exact: true })).toBeVisible();
});

test("locations cannot be deleted while used by jumps", async ({ page }) => {
    await registerUser(
        page,
        "guarded-location-skydiver",
        "Guarded Location Skydiver",
    );
    await addItem(page, {
        manageLink: "Manage locations",
        addLabel: "Add location",
        name: "Guarded DZ",
    });
    await page
        .getByRole("link", { name: /Guarded Location Skydiver's logbook/ })
        .click();
    await addItem(page, {
        manageLink: "Manage aircraft",
        addLabel: "Add aircraft",
        name: "Guarded Plane",
    });

    await page
        .getByRole("link", { name: /Guarded Location Skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await selectJumpItems(page, "Location", ["Guarded DZ"]);
    await selectJumpItems(page, "Aircraft", ["Guarded Plane"]);
    await page.getByRole("button", { name: "Add jump" }).click();
    await expectLogbookAroundJump(page, 1);

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Guarded DZ" })
        .getByRole("link", { name: "Edit" })
        .click();
    await openDangerZone(page);
    await confirmDelete(page, "Delete location");

    await expect(page).toHaveURL(/\/logbook\/locations\/[^/]+$/);
    await openDangerZone(page);
    await expect(
        page.getByText(
            "Cannot delete a location that is used by jumps. Archive it instead.",
        ),
    ).toBeVisible();
});
