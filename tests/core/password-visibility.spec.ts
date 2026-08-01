import { expect, test } from "./fixtures";

test("password visibility can be toggled independently", async ({ page }) => {
    await page.goto("/register");

    const password = page.locator('input[name="password"]');
    const confirmPassword = page.locator('input[name="confirmPassword"]');
    const passwordToggle = page.getByRole("button", {
        name: "Show/hide password",
    });

    await expect(password).toHaveAttribute("type", "password");
    await expect(confirmPassword).toHaveAttribute("type", "password");
    await expect(passwordToggle).toHaveCount(2);

    await passwordToggle.nth(0).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(confirmPassword).toHaveAttribute("type", "password");

    await passwordToggle.nth(1).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(confirmPassword).toHaveAttribute("type", "text");

    await passwordToggle.nth(0).click();
    await expect(password).toHaveAttribute("type", "password");
    await expect(confirmPassword).toHaveAttribute("type", "text");
});
