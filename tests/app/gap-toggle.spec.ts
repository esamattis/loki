import { acceptPrivacyPolicyIfRequired } from "./helpers";
import { expect, test, type Page } from "./fixtures";
import { openManageLogbook } from "./helpers";

const CSV_HEADER =
    "type,name,previousCount,jumpNumber,jumpDate,exitAltitude,openingAltitude,freefallTime,location,aircraft,gear,jumpTypes,description";

const fixtureCsv = [
    CSV_HEADER,
    "aircraft,Gap Plane,0,,,,,,,,,,",
    "location,Gap Drop Zone,0,,,,,,,,,,",
    "jump,,,1,2021-06-15,4000,1000,55,Gap Drop Zone,Gap Plane,,,First gap year jump",
    "jump,,,2,2023-06-15,4000,1000,55,Gap Drop Zone,Gap Plane,,,Second gap year jump",
    "jump,,,3,2023-07-15,4000,1000,55,Gap Drop Zone,Gap Plane,,,Second jump in 2023",
    "jump,,,4,2025-06-15,4000,1000,55,Gap Drop Zone,Gap Plane,,,Third active year jump",
    `jump,,,5,${new Date().getUTCFullYear()}-01-15,4000,1000,55,Gap Drop Zone,Gap Plane,,,Current year jump`,
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
    await acceptPrivacyPolicyIfRequired(page);
    await expect(page).toHaveURL("/logbook");
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
    await expect(page.getByText("Imported 5 jumps")).toBeVisible();

    await page
        .getByRole("link", { name: /gap-toggle-skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: "Statistics", exact: true }).click();
    await expect(page).toHaveURL("/logbook/statistics");
    await expect(
        page.getByRole("heading", { name: "Jumps per year" }),
    ).toBeVisible();

    const today = new Date();
    const firstJumpAnniversaryHasPassed =
        today.toISOString().slice(5, 10) >= "06-15";
    const expectedYearsSinceFirstJump =
        today.getUTCFullYear() - 2021 - (firstJumpAnniversaryHasPassed ? 0 : 1);
    await expect(
        page.getByText("Years since first jump").locator("..").locator("dd"),
    ).toHaveText(String(expectedYearsSinceFirstJump));
    await expect(
        page.getByText("Active jump years").locator("..").locator("dd"),
    ).toHaveText("4");
    const averageCard = page
        .getByText("Average jumps per active year")
        .locator("..");
    await expect(averageCard.locator("dd").first()).toHaveText(/1[,.]3/);
    await expect(averageCard).toContainText(
        "Based on years with at least one recorded jump. The current year is excluded.",
    );

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
