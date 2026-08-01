import { acceptPrivacyPolicyIfRequired } from "./helpers";
import { expect, test } from "./fixtures";
import { openManageLogbook } from "./helpers";

test("the logbook can be sorted by jump number and created date", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("sort-skydiver");
    await page.locator('input[name="displayName"]').fill("Sort Skydiver");
    await page.locator('input[name="email"]').fill("sort@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await acceptPrivacyPolicyIfRequired(page);

    const csv = [
        "type,name,previousCount,jumpNumber,jumpDate,exitAltitude,openingAltitude,freefallTime,location,aircraft,gear,jumpTypes,description",
        "aircraft,Sort Plane,0,,,,,,,,,,",
        "location,Sort Drop Zone,0,,,,,,,,,,",
        "jump,,,1,2021-06-15,4000,1000,55,Sort Drop Zone,Sort Plane,,,First",
        "jump,,,2,2021-07-15,4000,1000,55,Sort Drop Zone,Sort Plane,,,Second",
        "jump,,,5,2021-08-15,4000,1000,55,Sort Drop Zone,Sort Plane,,,Fifth",
    ].join("\n");

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles({
        name: "sort-jumps.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(csv),
    });
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 3 jumps")).toBeVisible();
    await page.getByRole("link", { name: /Sort Skydiver's logbook/ }).click();

    const jumpLinks = page.getByRole("link", { name: /#\d+/ });
    const addedLabels = page.getByRole("listitem").getByText(/^Added /);
    await expect(jumpLinks.first()).toHaveAccessibleName(/^#5 /);
    await expect(
        page.getByRole("heading", { name: "Missing jumps #3 - #4" }),
    ).toBeVisible();
    await expect(addedLabels).toHaveCount(0);

    await page.getByLabel("Sort jumps").selectOption("Jump # · low first");
    await expect(page).toHaveURL(/sort=jumpNumber-asc/);
    await expect(jumpLinks.first()).toHaveAccessibleName(/^#1 /);
    await expect(
        page.getByRole("heading", { name: "Missing jumps #3 - #4" }),
    ).toBeVisible();

    await page.getByLabel("Sort jumps").selectOption("Added · newest first");
    await expect(page).toHaveURL(/sort=createdAt-desc/);
    await expect(
        page.getByRole("heading", { name: /Missing jump/ }),
    ).toHaveCount(0);
    await expect(addedLabels).toHaveCount(3);

    await page.getByLabel("Sort jumps").selectOption("Jump # · high first");
    await expect(jumpLinks.first()).toHaveAccessibleName(/^#5 /);
    await expect(
        page.getByRole("heading", { name: "Missing jumps #3 - #4" }),
    ).toBeVisible();
    await expect(addedLabels).toHaveCount(0);
});
