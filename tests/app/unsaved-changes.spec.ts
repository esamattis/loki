import { acceptPrivacyPolicyIfRequired } from "./helpers";
import { expect, test } from "./fixtures";
import { openDangerZone, openManageLogbook } from "./helpers";

test("edited forms warn before leaving via a link", async ({ page }) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("unsaved-skydiver");
    await page.locator('input[name="displayName"]').fill("Unsaved Skydiver");
    await page.locator('input[name="email"]').fill("unsaved@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await acceptPrivacyPolicyIfRequired(page);
    await expect(page).toHaveURL("/logbook");

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page.getByRole("link", { name: "Add gear" }).click();
    await expect(page).toHaveURL("/logbook/gear/new");
    const dialog = page.locator("#unsaved-changes-dialog");

    await page.locator('input[name="name"]').fill("Dirty canopy");

    await page.getByRole("link", { name: "Cancel" }).click();

    await expect(
        dialog.getByRole("heading", { name: "Add gear" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Leave" })).toBeVisible();
    await expect(page.locator("#form-submit-progress")).toBeHidden();
    await expect(page).toHaveURL("/logbook/gear/new");

    await page.getByRole("button", { name: "Close" }).click();
    await expect(
        dialog.getByRole("heading", { name: "Add gear" }),
    ).toBeHidden();
    await expect(page).toHaveURL("/logbook/gear/new");
    await expect(page.locator('input[name="name"]')).toHaveValue(
        "Dirty canopy",
    );

    await page.getByRole("link", { name: "Cancel" }).click();
    await expect(
        dialog.getByRole("heading", { name: "Add gear" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
        dialog.getByRole("heading", { name: "Add gear" }),
    ).toBeHidden();
    await expect(page.locator('input[name="name"]')).toHaveValue(
        "Dirty canopy",
    );

    await page.getByRole("link", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page).toHaveURL("/logbook");
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await expect(page.getByText("Dirty canopy", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Add gear" }).click();
    await page.locator('input[name="name"]').fill("Merge target");
    await page.getByRole("button", { name: "Add gear" }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page
        .getByRole("listitem")
        .filter({ hasText: "Dirty canopy" })
        .getByRole("link", { name: "Edit" })
        .click();
    await openDangerZone(page);
    const mergeForm = page.locator("form").filter({
        has: page.locator('input[name="action"][value="merge"]'),
    });
    await mergeForm.locator('select[name="targetUuid"]').selectOption({
        label: "Merge target",
    });
    await page.getByRole("link", { name: "Back to gear" }).click();
    await expect(page).toHaveURL("/logbook/gear");
    await expect(
        dialog.getByRole("heading", { name: "Edit gear" }),
    ).toBeHidden();

    await page.getByRole("link", { name: "Add gear" }).click();
    await page.locator('input[name="name"]').fill("Abandoned canopy");
    await page.getByRole("link", { name: "Cancel" }).click();
    await expect(
        dialog.getByRole("heading", { name: "Add gear" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Leave" }).click();
    await expect(page).toHaveURL("/logbook/gear");
});
