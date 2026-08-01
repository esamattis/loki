import { expect, test } from "./fixtures";

test("redirects logged-in users from login", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="usernameOrEmail"]').fill("test-admin");
    await page.locator('input[name="password"]').fill("test-admin-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/logbook");

    await page.goto("/login?back=%2Fpreferences");
    await expect(page).toHaveURL("/preferences");

    await page.goto("/login");
    await expect(page).toHaveURL("/logbook");
});
