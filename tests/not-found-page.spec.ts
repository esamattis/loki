import { expect, test, type Page } from "@playwright/test";

async function registerUser(page: Page, username: string) {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="displayName"]').fill(username);
    await page.locator('input[name="email"]').fill(`${username}@example.test`);
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/logbook");
}

test("not found page shows 404 and a link back to the logbook", async ({
    page,
}) => {
    await registerUser(page, "not-found-page");

    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);

    await expect(
        page.getByRole("heading", { name: "404 — Not found" }),
    ).toBeVisible();
    const backLink = page.getByRole("link", { name: "Back to logbook" });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute("href", "/logbook");

    await backLink.click();
    await expect(page).toHaveURL("/logbook");
});
