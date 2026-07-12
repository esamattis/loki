import { expect, test, type Page } from "@playwright/test";

const fixtureRecords = [
    JSON.stringify({
        type: "aircraft",
        name: "Gap Plane",
        previousCount: 0,
    }),
    JSON.stringify({
        type: "location",
        name: "Gap Drop Zone",
        previousCount: 0,
    }),
    JSON.stringify({
        type: "jump",
        jumpNumber: 1,
        jumpDate: "2021-06-15",
        exitAltitude: 4000,
        openingAltitude: 1000,
        freefallTime: 55,
        location: "Gap Drop Zone",
        aircraft: "Gap Plane",
        description: "First gap year jump",
    }),
    JSON.stringify({
        type: "jump",
        jumpNumber: 2,
        jumpDate: "2023-06-15",
        exitAltitude: 4000,
        openingAltitude: 1000,
        freefallTime: 55,
        location: "Gap Drop Zone",
        aircraft: "Gap Plane",
        description: "Second gap year jump",
    }),
    JSON.stringify({
        type: "jump",
        jumpNumber: 3,
        jumpDate: "2025-06-15",
        exitAltitude: 4000,
        openingAltitude: 1000,
        freefallTime: 55,
        location: "Gap Drop Zone",
        aircraft: "Gap Plane",
        description: "Third gap year jump",
    }),
].join("\n");

async function registerUser(page: Page, username: string) {
    await page.goto("/register");
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="displayName"]').fill(username);
    await page.locator('input[name="email"]').fill(`${username}@example.test`);
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/logbook");
}

async function openManageLogbook(page: Page) {
    await page.getByRole("button", { name: "Manage logbook" }).click();
}

test("the Show gap years toggle hides and reveals histogram gap years", async ({
    page,
}) => {
    await registerUser(page, "gap-toggle-skydiver");
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles({
        name: "gap-years.jsonl",
        mimeType: "application/x-ndjson",
        buffer: Buffer.from(fixtureRecords),
    });
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 3 jumps")).toBeVisible();

    await page
        .getByRole("link", { name: /gap-toggle-skydiver's logbook/ })
        .click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Statistics", exact: true }).click();
    await expect(page).toHaveURL("/logbook/statistics");
    await expect(
        page.getByRole("heading", { name: "Jumps per year" }),
    ).toBeVisible();

    const toggle = page
        .locator("section")
        .filter({ has: page.getByRole("heading", { name: "Jumps per year" }) })
        .getByRole("checkbox", { name: "Show gap years" });

    await expect(toggle).toBeChecked();
    await expect(page.getByText("2022", { exact: true })).toBeVisible();
    await expect(page.getByText("2024", { exact: true })).toBeVisible();

    await toggle.uncheck();
    await expect(toggle).not.toBeChecked();
    await expect(page.getByText("2022", { exact: true })).toBeHidden();
    await expect(page.getByText("2024", { exact: true })).toBeHidden();
    await expect(page.getByText("2021", { exact: true })).toBeVisible();
    await expect(page.getByText("2023", { exact: true })).toBeVisible();
    await expect(page.getByText("2025", { exact: true })).toBeVisible();

    await toggle.check();
    await expect(toggle).toBeChecked();
    await expect(page.getByText("2022", { exact: true })).toBeVisible();
    await expect(page.getByText("2024", { exact: true })).toBeVisible();
});
