import {
    acceptPrivacyPolicyIfRequired,
    logOut,
    queryPlaywrightDb,
} from "./helpers";
import { expect, test } from "./fixtures";
import { openMainMenu } from "./helpers";

const localeCases = [
    {
        locale: "fi-FI",
        username: "finnish-locale-user",
        altitudeUnits: "meters",
        speedUnits: "kilometers-per-hour",
        dateTimeFormat: "finnish",
        numberFormat: "space-comma",
    },
    {
        locale: "de-DE",
        username: "german-locale-user",
        altitudeUnits: "meters",
        speedUnits: "kilometers-per-hour",
        dateTimeFormat: "european",
        numberFormat: "period-comma",
    },
    {
        locale: "en-US",
        username: "us-locale-user",
        altitudeUnits: "feet",
        speedUnits: "miles-per-hour",
        dateTimeFormat: "american",
        numberFormat: "comma-period",
    },
] as const;

async function registerLocaleUser(
    page: import("@playwright/test").Page,
    localeCase: (typeof localeCases)[number],
) {
    await page.goto("/register");
    for (const name of [
        "altitudeUnits",
        "speedUnits",
        "dateTimeFormat",
        "numberFormat",
    ] as const) {
        await expect(page.locator(`input[name="${name}"]`)).toHaveValue(
            localeCase[name],
        );
    }
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill(localeCase.username);
    await page
        .locator('input[name="email"]')
        .fill(`${localeCase.username}@example.test`);
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await acceptPrivacyPolicyIfRequired(page);
    await expect(page).toHaveURL("/logbook");
}

async function submitRegistration(
    page: import("@playwright/test").Page,
    username: string,
    email: string,
) {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
}

test("registration rejects an existing username and email", async ({
    page,
}) => {
    await submitRegistration(
        page,
        "registration-existing",
        "registration-existing@example.test",
    );
    await acceptPrivacyPolicyIfRequired(page);
    await expect(page).toHaveURL("/logbook");
    await logOut(page);

    await submitRegistration(
        page,
        "registration-existing",
        "registration-other@example.test",
    );
    await expect(page).toHaveURL("/register");
    await expect(page.getByText("Username is already in use")).toBeVisible();

    await submitRegistration(
        page,
        "registration-other",
        "registration-existing@example.test",
    );
    await expect(page).toHaveURL("/register");
    await expect(
        page.getByText("Email address is already in use"),
    ).toBeVisible();

    const matchingUsers = await queryPlaywrightDb(`
        SELECT uuid FROM users
        WHERE username IN ('registration-existing', 'registration-other')
           OR email IN (
               'registration-existing@example.test',
               'registration-other@example.test'
           )
    `);
    expect(matchingUsers).toHaveLength(1);
});

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
    await acceptPrivacyPolicyIfRequired(page);

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

test("registration rejects a colon in the username", async ({ page }) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("invalid:user");
    await page.locator('input[name="email"]').fill("colon-user@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await acceptPrivacyPolicyIfRequired(page);

    await expect(page).toHaveURL("/register");
    await expect(
        page.getByText("Username cannot contain a colon"),
    ).toBeVisible();
    await expect(page.locator('input[name="username"]')).toHaveValue(
        "invalid:user",
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
    await acceptPrivacyPolicyIfRequired(page);

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

for (const localeCase of localeCases) {
    test.describe(`registration locale ${localeCase.locale}`, () => {
        test.use({ locale: localeCase.locale });

        test("sets initial preferences from the browser locale", async ({
            page,
        }) => {
            await registerLocaleUser(page, localeCase);
            await openMainMenu(page);
            await page
                .getByRole("link", { name: "Preferences", exact: true })
                .click();

            for (const name of [
                "altitudeUnits",
                "speedUnits",
                "dateTimeFormat",
                "numberFormat",
            ] as const) {
                await expect(
                    page.locator(`select[name="${name}"]`),
                ).toHaveValue(localeCase[name]);
            }
        });
    });
}
