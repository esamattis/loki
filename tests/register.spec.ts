import { expect, test } from "@playwright/test";

test("registration form keeps field values when password is too short", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("short-password-user");
    await page.locator('input[name="displayName"]').fill("Short Password User");
    await page
        .locator('input[name="email"]')
        .fill("short-password@example.test");
    await page.locator('input[name="password"]').fill("short");
    await page.locator('input[name="confirmPassword"]').fill("short");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL("/register");
    await expect(
        page.getByText("Password must be at least 6 characters"),
    ).toBeVisible();
    await expect(page.locator('input[name="invitationCode"]')).toHaveValue(
        "test-invite",
    );
    await expect(page.locator('input[name="username"]')).toHaveValue(
        "short-password-user",
    );
    await expect(page.locator('input[name="displayName"]')).toHaveValue(
        "Short Password User",
    );
    await expect(page.locator('input[name="email"]')).toHaveValue(
        "short-password@example.test",
    );
});

test("registration form keeps field values when invitation code is wrong", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("wrong-invite");
    await page.locator('input[name="username"]').fill("bad-invite-user");
    await page.locator('input[name="displayName"]').fill("Bad Invite User");
    await page.locator('input[name="email"]').fill("bad-invite@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL("/register");
    await expect(
        page.getByText("Invalid or exhausted invitation code"),
    ).toBeVisible();
    await expect(page.locator('input[name="invitationCode"]')).toHaveValue(
        "wrong-invite",
    );
    await expect(page.locator('input[name="username"]')).toHaveValue(
        "bad-invite-user",
    );
    await expect(page.locator('input[name="displayName"]')).toHaveValue(
        "Bad Invite User",
    );
    await expect(page.locator('input[name="email"]')).toHaveValue(
        "bad-invite@example.test",
    );
});
