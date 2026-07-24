import { acceptPrivacyPolicyIfRequired } from "./helpers";
import { expect, test, type Page } from "./fixtures";
import { openManageLogbook } from "./helpers";

async function registerUser(page: Page, username: string, displayName: string) {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="displayName"]').fill(displayName);
    await page.locator('input[name="email"]').fill(`${username}@example.test`);
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await acceptPrivacyPolicyIfRequired(page);
    await expect(page).toHaveURL("/logbook");
}

async function addItem(
    page: Page,
    item: { manageLink: string; addLabel: string; name: string },
) {
    await openManageLogbook(page);
    await page.getByRole("link", { name: item.manageLink }).click();
    await page.getByRole("link", { name: item.addLabel }).click();
    await page.locator('input[name="name"]').fill(item.name);
    await page.getByRole("button", { name: item.addLabel }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: item.manageLink }).click();
}

const items = [
    {
        manageLink: "Manage gear",
        addLabel: "Add gear",
        name: "Edit Archive Canopy",
        listPath: "/logbook/gear",
    },
    {
        manageLink: "Manage locations",
        addLabel: "Add location",
        name: "Edit Archive DZ",
        listPath: "/logbook/locations",
    },
    {
        manageLink: "Manage aircraft",
        addLabel: "Add aircraft",
        name: "Edit Archive Plane",
        listPath: "/logbook/aircrafts",
    },
    {
        manageLink: "Manage jump types",
        addLabel: "Add jump type",
        name: "Edit Archive Freefly",
        listPath: "/logbook/jump-types",
    },
] as const;

test("jump item edit pages can archive and unarchive", async ({ page }) => {
    await registerUser(page, "edit-archive-skydiver", "Edit Archive Skydiver");

    for (const item of items) {
        await page
            .getByRole("link", { name: /Edit Archive Skydiver's logbook/ })
            .click();
        await addItem(page, item);

        await page
            .getByRole("listitem")
            .filter({ hasText: item.name })
            .getByRole("link", { name: "Edit" })
            .click();

        await expect(
            page.getByRole("button", { name: "Archive" }),
        ).toBeVisible();
        await expect(page.getByText("Archived", { exact: true })).toHaveCount(
            0,
        );

        await page.getByRole("button", { name: "Archive" }).click();
        await expect(page).toHaveURL(item.listPath);
        await expect(
            page
                .getByRole("listitem")
                .filter({ hasText: item.name })
                .getByText("Archived", { exact: true }),
        ).toBeVisible();

        await page
            .getByRole("listitem")
            .filter({ hasText: item.name })
            .getByRole("link", { name: "Edit" })
            .click();
        await expect(page.getByText("Archived", { exact: true })).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Unarchive" }),
        ).toBeVisible();

        await page.getByRole("button", { name: "Unarchive" }).click();
        await expect(page).toHaveURL(item.listPath);
        await expect(
            page
                .getByRole("listitem")
                .filter({ hasText: item.name })
                .getByText("Archived", { exact: true }),
        ).toHaveCount(0);
    }
});
