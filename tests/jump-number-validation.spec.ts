import { expect, test } from "./fixtures";
import { openManageLogbook, selectJumpItems } from "./helpers";

test("new jump page dynamically shows an error when jump number already exists", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page
        .locator('input[name="username"]')
        .fill("existing-jump-number-banner");
    await page
        .locator('input[name="displayName"]')
        .fill("Existing Jump Banner");
    await page
        .locator('input[name="email"]')
        .fill("existing-jump-number-banner@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page.getByRole("link", { name: "Add location" }).click();
    await page.locator('input[name="name"]').fill("Banner Drop Zone");
    await page.getByRole("button", { name: "Add location" }).click();

    await page
        .getByRole("link", { name: /Existing Jump Banner's logbook/ })
        .click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page.getByRole("link", { name: "Add aircraft" }).click();
    await page.locator('input[name="name"]').fill("Banner Plane");
    await page.getByRole("button", { name: "Add aircraft" }).click();

    await page
        .getByRole("link", { name: /Existing Jump Banner's logbook/ })
        .click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("357");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await selectJumpItems(page, "Location", ["Banner Drop Zone"]);
    await selectJumpItems(page, "Aircraft", ["Banner Plane"]);
    await page.getByRole("button", { name: "Add jump" }).click();
    await expect(page).toHaveURL("/logbook");

    await page.goto("/logbook/jumps/new");
    const jumpNumber = page.locator('input[name="jumpNumber"]');
    const duplicateError = page.getByText("Jump number 357 is already used.");

    await jumpNumber.fill("357");
    await expect(duplicateError).toBeVisible();

    await jumpNumber.fill("123");
    await expect(duplicateError).toBeHidden();

    await jumpNumber.fill("357");
    await expect(duplicateError).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(jumpNumber).toHaveValue("358");
    await expect(duplicateError).toBeHidden();
});
