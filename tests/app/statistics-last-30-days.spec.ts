import { acceptPrivacyPolicyIfRequired, openManageLogbook } from "./helpers";
import { expect, test, type Page } from "./fixtures";

const CSV_HEADER =
    "type,name,previousCount,jumpNumber,jumpDate,exitAltitude,openingAltitude,freefallTime,location,aircraft,gear,jumpTypes,description";

function utcDateOffset(days: number): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

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

test("statistics count jumps in the last 30 days", async ({ page }) => {
    await registerUser(page, "last-thirty-days-skydiver");
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    const csv = [
        CSV_HEADER,
        `jump,,,1,${utcDateOffset(-31)},4000,1000,55,,,,,Outside window`,
        `jump,,,2,${utcDateOffset(-30)},4000,1000,55,,,,,On boundary`,
        `jump,,,3,${utcDateOffset(0)},4000,1000,55,,,,,Today`,
    ].join("\n");
    await page.locator('input[name="file"]').setInputFiles({
        name: "logbook.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(csv),
    });
    await page.getByRole("button", { name: "Import logbook" }).click();
    await page
        .getByRole("link", { name: /last-thirty-days-skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: "Statistics", exact: true }).click();

    const lastThirtyDaysCard = page
        .getByText("Jumps in the last 30 days")
        .locator("..");
    await expect(lastThirtyDaysCard.locator("dd").first()).toHaveText("2");
});
