import { expect, test } from "./fixtures";

test("shows privacy policy and footer link", async ({ page }) => {
    await page.goto("/");

    await page
        .getByRole("navigation", { name: "Footer" })
        .getByRole("link", { name: "Privacy" })
        .click();

    await expect(page).toHaveURL("/privacy");
    await expect(
        page.getByRole("heading", { name: "Privacy Policy" }),
    ).toBeVisible();
    await expect(
        page.getByText("we do not share it with anyone", { exact: false }),
    ).toBeVisible();
    await expect(
        page.getByRole("heading", { name: "Where data is stored" }),
    ).toBeVisible();
    await expect(
        page.getByText("Cloudflare D1", { exact: false }),
    ).toBeVisible();
    await expect(
        page.getByText("global edge database", { exact: false }),
    ).toBeVisible();
    await expect(
        page.getByText("Optional AI Vision", { exact: false }),
    ).toBeVisible();
    await expect(
        page.getByText("do not run analytics", { exact: false }),
    ).toBeVisible();
    await expect(
        page.getByText("required login state handling", { exact: false }),
    ).toBeVisible();
});
