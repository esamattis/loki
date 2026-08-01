import { acceptPrivacyPolicyIfRequired } from "./helpers";
import { expect, test, type Page } from "./fixtures";
import {
    expectLogbookAroundJump,
    openDangerZone,
    openManageLogbook,
    selectJumpItems,
} from "./helpers";

async function registerAndAddFirstJump(
    page: Page,
    username: string,
    displayName: string,
) {
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

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page.getByRole("link", { name: "Add location" }).click();
    await page.locator('input[name="name"]').fill("Delete Drop Zone");
    await page.getByRole("button", { name: "Add location" }).click();

    await page.getByRole("link", { name: `${displayName}'s logbook` }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page.getByRole("link", { name: "Add aircraft" }).click();
    await page.locator('input[name="name"]').fill("Delete Plane");
    await page.getByRole("button", { name: "Add aircraft" }).click();

    await page.getByRole("link", { name: `${displayName}'s logbook` }).click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await selectJumpItems(page, "Location", ["Delete Drop Zone"]);
    await selectJumpItems(page, "Aircraft", ["Delete Plane"]);
    await page.locator('textarea[name="description"]').fill("Doomed jump");
    await page.getByRole("button", { name: "Add jump" }).click();

    await expectLogbookAroundJump(page, 1);
    await expect(page.getByRole("link", { name: /#1/ })).toBeVisible();
}

function deleteButton(page: Page) {
    return page
        .locator("form")
        .filter({
            has: page.locator('input[name="action"][value="delete"]'),
        })
        .getByRole("button");
}

test("a jump can be deleted from the edit view after the countdown elapses", async ({
    page,
}) => {
    await registerAndAddFirstJump(
        page,
        "deleting-skydiver",
        "Deleting Skydiver",
    );

    await page.getByRole("link", { name: /#1/ }).click();
    await expect(page).toHaveURL(/\/logbook\/jumps\//);
    const button = deleteButton(page);
    await expect(page.getByText("Danger Zone", { exact: true })).toBeVisible();
    await expect(button).toBeHidden();
    await openDangerZone(page);
    await expect(button).toBeVisible();

    await expect(button).toHaveText("Delete jump");

    // First click arms confirmation without deleting.
    await button.click();
    await expect(button).toHaveText("Confirm delete", { timeout: 1000 });

    // Now a click confirms and deletes the jump.
    await button.click();

    await expect(page).toHaveURL("/logbook");
    await expect(page.getByRole("link", { name: /#1/ })).toHaveCount(0);
    await expect(page.getByText("Doomed jump")).toHaveCount(0);
});

test("the first delete click only arms confirmation and does not delete", async ({
    page,
}) => {
    await registerAndAddFirstJump(
        page,
        "countdown-skydiver",
        "Countdown Skydiver",
    );

    await page.getByRole("link", { name: /#1/ }).click();
    await openDangerZone(page);
    const button = deleteButton(page);

    await button.click();
    await expect(button).toHaveText("Confirm delete", { timeout: 1000 });
    await expect(button).toBeEnabled();
    await expect(page).toHaveURL(/\/logbook\/jumps\//);
    await expect(page.getByText("Doomed jump")).toBeVisible();
});

test("clicking outside the confirm button resets it", async ({ page }) => {
    await registerAndAddFirstJump(page, "reset-skydiver", "Reset Skydiver");

    await page.getByRole("link", { name: /#1/ }).click();
    await openDangerZone(page);
    const button = deleteButton(page);

    await button.click();
    await expect(button).toHaveText("Confirm delete", { timeout: 1000 });

    await page.getByText("Doomed jump").click();
    await expect(button).toHaveText("Delete jump");
    await expect(page).toHaveURL(/\/logbook\/jumps\//);
    await expect(page.getByText("Doomed jump")).toBeVisible();
});
