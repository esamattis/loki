import { acceptPrivacyPolicyIfRequired } from "../helpers";
import { expect, test } from "../fixtures";
import {
    expectLogbookAroundJump,
    openManageLogbook,
    selectJumpItems,
    setJumpNumber,
} from "../helpers";

test("adding a jump with an existing jump number shows an overwrite warning and link", async ({
    page,
}, testInfo) => {
    const retrySuffix = testInfo.retry === 0 ? "" : `-${testInfo.retry}`;
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page
        .locator('input[name="username"]')
        .fill(`duplicate-jump-number${retrySuffix}`);
    await page.locator('input[name="displayName"]').fill("Duplicate Jumper");
    await page
        .locator('input[name="email"]')
        .fill(`duplicate-jump-number${retrySuffix}@example.test`);
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await acceptPrivacyPolicyIfRequired(page);

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
    await setJumpNumber(page, "1");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await selectJumpItems(page, "Location", ["Duplicate Drop Zone"]);
    await selectJumpItems(page, "Aircraft", ["Duplicate Plane"]);
    await page.getByRole("button", { name: "Add jump" }).click();
    await expectLogbookAroundJump(page, 1);

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await setJumpNumber(page, "1");
    await expect(page.getByText("Jump #1 already exists.")).toBeVisible();
    await expect(
        page.locator('select[name="jumpNumberConflict"]'),
    ).toBeVisible();
    await page.getByRole("link", { name: "Open existing jump" }).click();
    await expect(page).toHaveURL(/\/logbook\/jumps\/.+/);
    await expect(page.locator('input[name="jumpNumber"]')).toHaveValue("1");
});
