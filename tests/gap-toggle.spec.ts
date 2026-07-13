import { expect, test, type Page } from "@playwright/test";

const CSV_HEADER =
    "type,name,previousCount,jumpNumber,jumpDate,exitAltitude,openingAltitude,freefallTime,location,aircraft,gear,jumpTypes,description";

const fixtureCsv = [
    CSV_HEADER,
    "aircraft,Gap Plane,0,,,,,,,,,,",
    "location,Gap Drop Zone,0,,,,,,,,,,",
    "jump,,,1,2021-06-15,4000,1000,55,Gap Drop Zone,Gap Plane,,,First gap year jump",
    "jump,,,2,2023-06-15,4000,1000,55,Gap Drop Zone,Gap Plane,,,Second gap year jump",
    "jump,,,3,2025-06-15,4000,1000,55,Gap Drop Zone,Gap Plane,,,Third gap year jump",
].join("\n");

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
        name: "gap-years.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(fixtureCsv),
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
