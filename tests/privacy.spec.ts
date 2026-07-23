import { expect, test, type Page } from "./fixtures";
import { queryPlaywrightDb } from "./helpers";

async function registerUnacceptedUser(page: Page, username: string) {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="email"]').fill(`${username}@example.test`);
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
}

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
        page.getByText(
            "do not guarantee any data durability, security, backups, or availability of the service",
            { exact: true },
        ),
    ).toHaveCSS("font-weight", "700");
    await expect(
        page.getByText("We do not sell or share", { exact: false }),
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
        page.getByText("AI Vision is opt-in", { exact: false }),
    ).toBeVisible();
    await expect(
        page.getByText("do not run analytics", { exact: false }),
    ).toBeVisible();
    await expect(
        page.getByText("required login state handling", { exact: false }),
    ).toBeVisible();
});

test("requires hosted users to accept the privacy policy", async ({ page }) => {
    const username = "privacy-acceptance-user";
    await registerUnacceptedUser(page, username);

    await expect(page).toHaveURL("/privacy?back=%2Flogbook");
    await expect(
        page.getByText(
            "You must accept the privacy policy to continue using Loki.",
        ),
    ).toBeVisible();
    const acceptanceForm = page.locator("form").filter({
        has: page.getByRole("button", {
            name: "Accept privacy policy",
        }),
    });
    await expect(acceptanceForm.locator('input[type="checkbox"]')).toHaveCount(
        1,
    );
    await expect(
        acceptanceForm.locator('input[name="__loki_redirect_back_after_post"]'),
    ).toHaveValue("true");

    await page.getByRole("button", { name: "Accept privacy policy" }).click();
    await expect(
        page.getByText("You must check the box to accept the privacy policy."),
    ).toBeVisible();

    await page.locator('input[name="accepted"]').check();
    await page.getByRole("button", { name: "Accept privacy policy" }).click();
    await expect(page).toHaveURL("/logbook");

    const accepted = await queryPlaywrightDb(`
        SELECT json_extract(options, '$.privacyPolicyAccepted') AS accepted
        FROM users
        WHERE username = '${username}';
    `);
    expect(Number(accepted[0]?.accepted)).toBe(1);

    await page.goto("/preferences");
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page).toHaveURL("/logbook");
});

test("offers account deletion instead of policy acceptance", async ({
    page,
}) => {
    const username = "privacy-delete-user";
    await registerUnacceptedUser(page, username);

    const deleteButton = page
        .locator("form")
        .filter({
            has: page.locator('input[name="action"][value="delete"]'),
        })
        .getByRole("button");
    await deleteButton.click();
    await expect(deleteButton).toHaveText("Confirm delete");
    await deleteButton.click();

    await expect(page).toHaveURL("/login");
    const users = await queryPlaywrightDb(`
        SELECT count(*) AS count
        FROM users
        WHERE username = '${username}';
    `);
    expect(Number(users[0]?.count)).toBe(0);
});
