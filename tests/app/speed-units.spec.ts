import { acceptPrivacyPolicyIfRequired } from "./helpers";
import { expect, test } from "./fixtures";
import { expectLogbookAroundJump, openMainMenu } from "./helpers";

test("speed can be displayed and entered in miles per hour", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("mph-skydiver");
    await page.locator('input[name="displayName"]').fill("MPH Skydiver");
    await page.locator('input[name="email"]').fill("mph@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await acceptPrivacyPolicyIfRequired(page);

    await openMainMenu(page);
    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await page
        .locator('select[name="speedUnits"]')
        .selectOption("miles-per-hour");
    await page.getByRole("button", { name: "Save preferences" }).click();

    await openMainMenu(page);
    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await expect(page.locator('select[name="speedUnits"]')).toHaveValue(
        "miles-per-hour",
    );

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await expect(page.getByLabel("Custom speed (mph)")).toHaveValue("111.8");
    await page.getByRole("button", { name: "Add jump" }).click();
    await expectLogbookAroundJump(page, 1);

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.getByRole("button", { name: "Estimate" }).click();
    await page.getByRole("button", { name: "Belly · 112 mph" }).click();
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("60");
    await expect(
        page.getByRole("status", { name: "Average speed" }),
    ).toHaveText("112 mph");

    await page.getByRole("button", { name: "Estimate" }).click();
    await page.getByLabel("Custom speed (mph)").fill("100");
    await page.getByRole("button", { name: "Use custom speed" }).click();
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("67");
    await expect(
        page.getByRole("status", { name: "Average speed" }),
    ).toHaveText("100 mph");
});
