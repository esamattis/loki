import { expect, test, type Page } from "./fixtures";
import { openManageLogbook } from "./helpers";

const CSV_HEADER =
    "type,name,previousCount,jumpNumber,jumpDate,exitAltitude,openingAltitude,freefallTime,location,aircraft,gear,jumpTypes,description";

const fixtureCsv = [
    CSV_HEADER,
    "aircraft,Gap Plane,0,,,,,,,,,,",
    "location,Gap Drop Zone,0,,,,,,,,,,",
    "jump,,,1,2021-06-15,4000,1000,55,Gap Drop Zone,Gap Plane,,,First jump",
    "jump,,,2,2021-07-15,4000,1000,55,Gap Drop Zone,Gap Plane,,,Second jump",
    "jump,,,5,2021-08-15,4000,1000,55,Gap Drop Zone,Gap Plane,,,Fifth jump",
    "jump,,,8,2021-09-15,4000,1000,0,Gap Drop Zone,Gap Plane,,,Incomplete eighth jump",
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

test("statistics page lists jump number gaps and insufficient data", async ({
    page,
}) => {
    await registerUser(page, "jump-gaps-skydiver");
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles({
        name: "jump-gaps.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(fixtureCsv),
    });
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 4 jumps")).toBeVisible();

    await page
        .getByRole("link", { name: /jump-gaps-skydiver's logbook/ })
        .click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Statistics", exact: true }).click();
    await expect(page).toHaveURL("/logbook/statistics");

    const section = page.locator("section").filter({
        has: page.getByRole("heading", { name: "Jump number gaps" }),
    });
    await expect(section).toBeVisible();
    await expect(section.getByText("4 missing")).toBeVisible();

    for (const jumpNumber of [3, 4, 6, 7]) {
        await expect(
            section.getByRole("link", { name: `#${jumpNumber}` }),
        ).toBeVisible();
    }

    await section.getByRole("link", { name: "#3" }).click();
    await expect(page).toHaveURL(/\/logbook\/jumps\/new\?.*jumpNumber=3/);
    await expect(page.locator('input[name="jumpNumber"]')).toHaveValue("3");

    await page.goto("/logbook/statistics");
    const insufficientDataSection = page.locator("section").filter({
        has: page.getByRole("heading", {
            name: "Jumps with insufficient data",
        }),
    });
    await expect(insufficientDataSection).toBeVisible();
    await expect(insufficientDataSection.getByText("1 jump")).toBeVisible();
    await insufficientDataSection.getByRole("link", { name: "#8" }).click();
    await expect(page).toHaveURL(/\/logbook\/jumps\/[^/]+$/);
    await expect(page.locator('input[name="jumpNumber"]')).toHaveValue("8");
});
