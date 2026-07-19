import { expect, test } from "./fixtures";
import { openManageLogbook, selectJumpItems } from "./helpers";

test("new jump page dynamically shows an overwrite warning when jump number already exists", async ({
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
    const overwriteWarning = page.getByText(
        "Jump #357 already exists. Saving will overwrite the existing jump.",
    );

    await jumpNumber.fill("357");
    await expect(overwriteWarning).toBeVisible();
    await expect(
        page.getByRole("link", { name: "Open existing jump" }),
    ).toBeVisible();

    await jumpNumber.fill("123");
    await expect(overwriteWarning).toBeHidden();

    await jumpNumber.fill("357");
    await expect(overwriteWarning).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(jumpNumber).toHaveValue("358");
    await expect(overwriteWarning).toBeHidden();
});

test("adding a jump with an existing jump number overwrites the existing jump", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("overwrite-jump-number");
    await page.locator('input[name="displayName"]').fill("Overwrite Jumper");
    await page
        .locator('input[name="email"]')
        .fill("overwrite-jump-number@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page.getByRole("link", { name: "Add location" }).click();
    await page.locator('input[name="name"]').fill("Overwrite Drop Zone");
    await page.getByRole("button", { name: "Add location" }).click();

    await page
        .getByRole("link", { name: /Overwrite Jumper's logbook/ })
        .click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page.getByRole("link", { name: "Add aircraft" }).click();
    await page.locator('input[name="name"]').fill("Overwrite Plane");
    await page.getByRole("button", { name: "Add aircraft" }).click();

    await page
        .getByRole("link", { name: /Overwrite Jumper's logbook/ })
        .click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await page.locator('textarea[name="description"]').fill("Original jump");
    await selectJumpItems(page, "Location", ["Overwrite Drop Zone"]);
    await selectJumpItems(page, "Aircraft", ["Overwrite Plane"]);
    await page.getByRole("button", { name: "Add jump" }).click();
    await expect(page).toHaveURL("/logbook");
    await expect(page.getByText("Original jump")).toBeVisible();

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await expect(
        page.getByText(
            "Jump #1 already exists. Saving will overwrite the existing jump.",
        ),
    ).toBeVisible();
    await page.locator('input[name="exitAltitude"]').fill("3500");
    await page.locator('input[name="openingAltitude"]').fill("900");
    await page.locator('input[name="freefallTime"]').fill("45");
    await page.locator('textarea[name="description"]').fill("Replaced jump");
    await selectJumpItems(page, "Location", ["Overwrite Drop Zone"]);
    await selectJumpItems(page, "Aircraft", ["Overwrite Plane"]);
    await page.getByRole("button", { name: "Add jump" }).click();

    await expect(page).toHaveURL("/logbook");
    await expect(page.getByRole("link", { name: /#1/ })).toHaveCount(1);
    await expect(page.getByText("Replaced jump")).toBeVisible();
    await expect(page.getByText("Original jump")).toHaveCount(0);
    await expect(page.getByText(/3\s500 m/, { exact: true })).toBeVisible();
    await expect(page.getByText(/900 m/, { exact: true })).toBeVisible();
    await expect(
        page
            .getByRole("link", { name: /#1/ })
            .getByText("45s", { exact: true }),
    ).toBeVisible();
});
