import { acceptPrivacyPolicyIfRequired } from "./helpers";
import { expect, test, type Page } from "./fixtures";
import { openManageLogbook } from "./helpers";

async function registerUser(page: Page, username: string) {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="displayName"]').fill(username);
    await page.locator('input[name="email"]').fill(`${username}@example.test`);
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await acceptPrivacyPolicyIfRequired(page);
    await expect(page).toHaveURL("/logbook");
}

test("empty logbook can load example data with a jump number gap", async ({
    page,
}) => {
    await registerUser(page, "example-data-skydiver");

    await expect(
        page.getByRole("heading", { name: "Start your logbook" }),
    ).toBeVisible();
    const loadExample = page.getByRole("button", { name: "Load example data" });
    await expect(loadExample).toBeVisible();

    await loadExample.click();
    await expect(page).toHaveURL("/logbook");
    await expect(
        page.getByRole("heading", { name: "Start your logbook" }),
    ).toHaveCount(0);
    await expect(
        page.getByRole("heading", { name: "622 Jumps" }),
    ).toBeVisible();
    await expect(
        page.getByRole("link", {
            name: /#622\b.*Wingsuit.*Skydive Chicago.*Twin Otter/,
        }),
    ).toBeVisible();
    await expect(
        page.getByText("Long flock at sunset. Clean flight, clean open"),
    ).toBeVisible();
    await expect(
        page
            .getByText("Gear: Mirage G4, PD Horizon 120, Squirrel Aura 3")
            .first(),
    ).toBeVisible();

    await page.getByRole("searchbox", { name: "Search jumps" }).fill("96");
    await page.getByRole("button", { name: "Go to jump number" }).click();
    await expect(
        page.getByRole("heading", { name: "Missing jumps #97 - #98" }),
    ).toBeVisible();
    for (const jumpNumber of [97, 98]) {
        await expect(
            page.getByRole("link", { name: `Add jump #${jumpNumber}` }),
        ).toBeVisible();
    }
});

test("example data injection refuses when jumps already exist", async ({
    page,
}) => {
    await registerUser(page, "example-data-refused");

    await page.getByRole("button", { name: "Load example data" }).click();
    await expect(
        page.getByRole("heading", { name: "622 Jumps" }),
    ).toBeVisible();

    const response = await page.request.post("/logbook/inject-example-data", {
        maxRedirects: 0,
    });
    expect(response.status()).toBe(400);
    expect(await response.text()).toContain(
        "Example data can only be loaded when the logbook has no jumps.",
    );
});

test("example data clears existing jump items when the logbook has no jumps", async ({
    page,
}) => {
    await registerUser(page, "example-data-clears-items");

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page.getByRole("link", { name: "Add location" }).click();
    await page.locator('input[name="name"]').fill("Orphan Drop Zone");
    await page.getByRole("button", { name: "Add location" }).click();

    await page
        .getByRole("link", { name: /example-data-clears-items's logbook/ })
        .click();
    await page.getByRole("button", { name: "Load example data" }).click();
    await expect(
        page.getByRole("heading", { name: "622 Jumps" }),
    ).toBeVisible();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await expect(page.getByText("Orphan Drop Zone")).toHaveCount(0);
    await expect(page.getByText("Skydive Chicago")).toBeVisible();
});
