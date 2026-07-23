import { logOut, openMainMenu } from "./helpers";
import { expect, test, type APIRequestContext, type Page } from "./fixtures";

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

async function sessionCookieHeader(page: Page): Promise<string> {
    const cookies = await page.context().cookies();
    return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

async function postAsPage(
    page: Page,
    request: APIRequestContext,
    options: { path: string; form: Record<string, string> },
) {
    return request.post(options.path, {
        form: options.form,
        headers: {
            Cookie: await sessionCookieHeader(page),
        },
        maxRedirects: 0,
    });
}

test("non-admins cannot access admin pages", async ({ page }) => {
    await registerUser(page, "non-admin-pages");

    await openMainMenu(page);
    await expect(
        page.getByRole("link", { name: "Admin", exact: true }),
    ).toHaveCount(0);

    for (const path of [
        "/admin",
        "/admin/invitations/new",
        "/admin/invitations/test-invite",
    ]) {
        const response = await page.goto(path);
        expect(response?.status()).toBe(404);
    }
});

test("shows the invitation code used to register each user", async ({
    page,
}) => {
    await registerUser(page, "invitation-tracked-user");
    await logOut(page);

    await page.locator('input[name="usernameOrEmail"]').fill("test-admin");
    await page.locator('input[name="password"]').fill("test-admin-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/logbook");
    await page.goto("/admin");

    const sectionNavigation = page.getByRole("navigation", {
        name: "Admin sections",
    });
    await expect(
        sectionNavigation.getByRole("link", { name: "Invitations" }),
    ).toHaveAttribute("href", "#invitations");
    await expect(
        sectionNavigation.getByRole("link", { name: "Users" }),
    ).toHaveAttribute("href", "#users");
    await expect(
        sectionNavigation.getByRole("link", { name: "Sessions" }),
    ).toHaveAttribute("href", "#sessions");

    const sections = page.locator("main > section");
    await expect(sections.nth(0)).toHaveAttribute("id", "invitations");
    await expect(sections.nth(1)).toHaveAttribute("id", "users");
    await expect(sections.nth(2)).toHaveAttribute("id", "sessions");

    const usersSection = page.locator("section").filter({
        has: page.getByRole("heading", { name: "Users", exact: true }),
    });
    const invitedUser = usersSection.getByRole("listitem").filter({
        hasText: "@invitation-tracked-user",
    });
    await expect(invitedUser).toContainText("Invitation code: test-invite");
    await expect(invitedUser).toContainText("Created:");
    await expect(invitedUser).toContainText("Last seen:");

    const seededAdmin = usersSection.getByRole("listitem").filter({
        hasText: "@test-admin",
    });
    await expect(seededAdmin).toContainText("Invitation code: Not recorded");
});

test("does not allow removing the last admin", async ({ page, request }) => {
    await page.goto("/login");
    await page.locator('input[name="usernameOrEmail"]').fill("test-admin");
    await page.locator('input[name="password"]').fill("test-admin-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.goto("/admin");

    const adminUser = page.getByRole("listitem").filter({
        hasText: "@test-admin",
    });
    const removeButton = adminUser.getByRole("button", {
        name: "Remove admin",
    });
    await expect(removeButton).toBeDisabled();
    await expect(removeButton).toHaveAttribute(
        "data-loki-tooltip",
        "The last admin cannot be removed",
    );

    const uuid = await adminUser
        .locator('form[action="/admin/toggle-admin"] input[name="uuid"]')
        .inputValue();
    const response = await postAsPage(page, request, {
        path: "/admin/toggle-admin",
        form: { uuid },
    });
    expect(response.status()).toBe(302);

    await page.reload();
    await expect(page).toHaveURL("/admin");
    await expect(removeButton).toBeDisabled();
});

test("admin can make a user read-only and log in as them", async ({ page }) => {
    await registerUser(page, "readonly-target");
    await logOut(page);

    await page.locator('input[name="usernameOrEmail"]').fill("test-admin");
    await page.locator('input[name="password"]').fill("test-admin-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/logbook");
    await page.goto("/admin");

    const targetUser = page.getByRole("listitem").filter({
        hasText: "@readonly-target",
    });
    await expect(
        targetUser.getByText("Read-only", { exact: true }),
    ).toHaveCount(0);
    await targetUser.getByRole("button", { name: "Make read-only" }).click();
    await expect(page).toHaveURL("/admin");
    await expect(
        targetUser.getByText("Read-only", { exact: true }),
    ).toBeVisible();
    await expect(
        targetUser.getByRole("button", { name: "Remove read-only" }),
    ).toBeVisible();

    await targetUser.getByRole("button", { name: "Log in as" }).click();
    await expect(page).toHaveURL("/logbook");
    await expect(
        page.getByRole("link", { name: /readonly-target's logbook/ }),
    ).toBeVisible();

    await page.goto("/logbook/jumps/new");
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.getByRole("button", { name: "Add jump" }).click();
    await expect(page).toHaveURL("/readonly");
    await expect(
        page.getByRole("heading", { name: "Read-only account" }),
    ).toBeVisible();
});

test("non-admins cannot perform admin actions", async ({ page, request }) => {
    await registerUser(page, "non-admin-actions");

    const loginAsResponse = await postAsPage(page, request, {
        path: "/admin/login-as",
        form: { uuid: "00000000-0000-0000-0000-000000000000" },
    });
    expect(loginAsResponse.status()).toBe(404);

    const toggleAdminResponse = await postAsPage(page, request, {
        path: "/admin/toggle-admin",
        form: { uuid: "00000000-0000-0000-0000-000000000000" },
    });
    expect(toggleAdminResponse.status()).toBe(404);

    const createInvitationResponse = await postAsPage(page, request, {
        path: "/admin/invitations/new",
        form: { code: "stolen-invite", count: "10" },
    });
    expect(createInvitationResponse.status()).toBe(404);

    const editInvitationResponse = await postAsPage(page, request, {
        path: "/admin/invitations/test-invite",
        form: { code: "test-invite", count: "0" },
    });
    expect(editInvitationResponse.status()).toBe(404);

    // Session must remain the non-admin user after blocked login-as.
    await page.goto("/logbook");
    await expect(page).toHaveURL("/logbook");
    await expect(
        page.getByRole("link", { name: /non-admin-actions's logbook/ }),
    ).toBeVisible();

    // Blocked invitation create must not have created the code.
    await logOut(page);
    await expect(page).toHaveURL("/login");
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("stolen-invite");
    await page.locator('input[name="username"]').fill("stolen-invite-user");
    await page.locator('input[name="displayName"]').fill("Stolen Invite User");
    await page
        .locator('input[name="email"]')
        .fill("stolen-invite@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/register");
    await expect(
        page.getByText("Invalid or exhausted invitation code"),
    ).toBeVisible();

    // Blocked invitation edit must not have exhausted the test invite.
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("still-valid-invite");
    await page.locator('input[name="displayName"]').fill("Still Valid Invite");
    await page
        .locator('input[name="email"]')
        .fill("still-valid-invite@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/logbook");
});
