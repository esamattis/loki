import { expect, test } from "./fixtures";
import { openMainMenu } from "./helpers";

test("shows open source and self-hosting information", async ({ page }) => {
    await page.goto("/about");

    await expect(page).toHaveURL("/about");
    await expect(page.getByLabel("Build information")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
    await expect(
        page.getByRole("link", { name: "Create account" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
    await expect(
        page.getByText("GNU Affero General Public License"),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "GitHub" })).toHaveAttribute(
        "href",
        "https://github.com/esamattis/loki",
    );
    await expect(
        page.getByRole("link", { name: "releases page" }),
    ).toHaveAttribute("href", "https://github.com/esamattis/loki/releases");

    await page.getByRole("link", { name: "Log in" }).click();
    await expect(page.getByRole("link", { name: "About Loki" })).toBeVisible();
    await page.locator('input[name="usernameOrEmail"]').fill("test-admin");
    await page.locator('input[name="password"]').fill("test-admin-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await openMainMenu(page);
    await page.getByRole("link", { name: "About", exact: true }).click();

    await expect(page).toHaveURL("/about");
    await expect(page.getByLabel("Build information")).toBeVisible();
});
