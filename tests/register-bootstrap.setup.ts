import { logOut, openMainMenu } from "./helpers";
import { expect, test } from "./fixtures";

test("bootstrap admin and require invitations for later users", async ({
    page,
}) => {
    await page.goto("/");
    await expect(page).toHaveURL("/register");
    await expect(
        page.getByRole("heading", { name: "First account: administrator" }),
    ).toBeVisible();
    await expect(
        page.getByText(
            "All later accounts are normal non-admin users and require an invitation created by an administrator.",
        ),
    ).toBeVisible();
    await expect(page.locator('input[name="invitationCode"]')).toHaveCount(0);
    await page.locator('input[name="username"]').fill("test-admin");
    await page.locator('input[name="displayName"]').fill("Test Admin");
    await page.locator('input[name="email"]').fill("test-admin@example.test");
    await page.locator('input[name="password"]').fill("test-admin-password");
    await page
        .locator('input[name="confirmPassword"]')
        .fill("test-admin-password");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/logbook");

    await openMainMenu(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    for (const name of [
        "Cessna Caravan",
        "OH-DZF",
        "Cessna 182",
        "OH-AIK",
        "Cessna 206",
        "OH-ARR",
    ]) {
        await expect(page.getByText(name, { exact: true })).toBeVisible();
    }

    await page.getByRole("link", { name: /Test Admin's logbook/ }).click();
    await openMainMenu(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    for (const name of ["EFUT", "EFJY", "EFAL", "EFSE", "EFLP"]) {
        await expect(page.getByText(name, { exact: true })).toBeVisible();
    }

    await page.getByRole("link", { name: /Test Admin's logbook/ }).click();
    await openMainMenu(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    for (const name of ["PD Navigator", "PD Sabre 2", "SQRL Freak 5"]) {
        await expect(page.getByText(name, { exact: true })).toBeVisible();
    }

    await openMainMenu(page);
    await expect(
        page.getByRole("link", { name: "Admin", exact: true }),
    ).toBeVisible();
    await page.goto("/admin/invitations/new");
    await page.locator('input[name="code"]').fill("test-invite");
    await page.locator('input[name="count"]').fill("1000000");
    await page.getByRole("button", { name: "Create invitation" }).click();
    await expect(page).toHaveURL("/admin");

    await logOut(page);
    await page.goto("/register");
    const invitationInput = page.locator('input[name="invitationCode"]');
    await expect(invitationInput).toHaveAttribute("required", "");
    await page.locator('input[name="username"]').fill("invited-setup-user");
    await page
        .locator('input[name="email"]')
        .fill("invited-setup-user@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await invitationInput.evaluate((element) => {
        element.removeAttribute("required");
    });
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/register");
    await expect(page.getByText("Invitation code is required")).toBeVisible();

    await invitationInput.fill("test-invite");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/logbook");
    await openMainMenu(page);
    await expect(
        page.getByRole("link", { name: "Admin", exact: true }),
    ).toHaveCount(0);
});
