import { acceptPrivacyPolicyIfRequired } from "./helpers";
import { expect, test } from "./fixtures";
import {
    expectLogbookAroundJump,
    jumpItemSummary,
    openManageLogbook,
    selectJumpItems,
} from "./helpers";

test("an existing and a new aircraft can be added to a new jump", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page
        .locator('input[name="username"]')
        .fill("mixed-aircraft-skydiver");
    await page
        .locator('input[name="displayName"]')
        .fill("Mixed Aircraft Skydiver");
    await page
        .locator('input[name="email"]')
        .fill("mixed-aircraft@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await acceptPrivacyPolicyIfRequired(page);

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page.getByRole("link", { name: "Add aircraft" }).click();
    await page.locator('input[name="name"]').fill("Existing Plane");
    await page.getByRole("button", { name: "Add aircraft" }).click();

    await page
        .getByRole("link", { name: /Mixed Aircraft Skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator("[data-loki-jump-date-input]").fill("2024-07-01");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await page.locator('input[name="locationName"]').fill("Mixed Drop Zone");
    await selectJumpItems(page, "Aircraft", ["Existing Plane"]);
    await page.locator('input[name="aircraftName"]').fill("New Plane");
    await page.getByRole("button", { name: "Add jump" }).click();

    await expectLogbookAroundJump(page, 1);
    const jump = page.getByRole("link", { name: /#1/ });
    await expect(jump).toContainText("Mixed Drop Zone");
    await expect(jump).toContainText("Existing Plane, New Plane");

    await jump.click();
    await expect(jumpItemSummary(page, "Aircraft")).toContainText(
        "Existing Plane",
    );
    await expect(jumpItemSummary(page, "Aircraft")).toContainText("New Plane");
});
