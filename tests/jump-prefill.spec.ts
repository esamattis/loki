import { acceptPrivacyPolicyIfRequired } from "./helpers";
import { expect, test } from "./fixtures";
import {
    executePlaywrightDb,
    jumpItemSummary,
    openManageLogbook,
    queryPlaywrightDb,
} from "./helpers";

test("new jump prefills from highest jump number and can switch to last added", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("prefill-skydiver");
    await page.locator('input[name="displayName"]').fill("Prefill Skydiver");
    await page.locator('input[name="email"]').fill("prefill@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await acceptPrivacyPolicyIfRequired(page);

    const csv = [
        "type,name,previousCount,jumpNumber,jumpDate,exitAltitude,openingAltitude,freefallTime,location,aircraft,gear,jumpTypes,description",
        "location,High Number DZ,0,,,,,,,,,,",
        "location,Last Added DZ,0,,,,,,,,,,",
        "jump,,,10,2024-06-10,4000,1000,55,High Number DZ,,,,",
        "jump,,,5,2024-06-05,3000,1200,40,Last Added DZ,,,,",
    ].join("\n");

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles({
        name: "prefill-jumps.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(csv),
    });
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 2 jumps")).toBeVisible();

    const userRows = await queryPlaywrightDb(`
        SELECT uuid FROM users WHERE username = 'prefill-skydiver'
    `);
    const userUuid = userRows[0]?.uuid;
    if (typeof userUuid !== "string") {
        throw new Error("Expected prefill user");
    }
    await executePlaywrightDb(`
        UPDATE jumps
        SET created_at = 100
        WHERE user_uuid = '${userUuid}' AND jump_number = 10
    `);
    await executePlaywrightDb(`
        UPDATE jumps
        SET created_at = 200
        WHERE user_uuid = '${userUuid}' AND jump_number = 5
    `);

    await page
        .getByRole("link", { name: /Prefill Skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await expect(page.getByText(/Fields prefilled from/)).toBeVisible();
    await expect(page.getByRole("link", { name: "jump #10" })).toBeVisible();
    await expect(jumpItemSummary(page, "Location")).toContainText(
        "High Number DZ",
    );
    await expect(page.locator('input[name="exitAltitude"]')).toHaveValue(
        "4000",
    );

    const useLastAdded = page.getByRole("link", {
        name: "Use last added #5",
    });
    await expect(useLastAdded).toBeVisible();
    await useLastAdded.hover();
    await expect(page.getByRole("tooltip")).toContainText(
        "Jump #5 was added more recently than jump #10",
    );
    await useLastAdded.click();

    await expect(page).toHaveURL(/\/logbook\/jumps\/new\?from=/);
    await expect(page.getByRole("link", { name: "jump #5" })).toBeVisible();
    await expect(
        page.getByRole("link", { name: /Use last added/ }),
    ).toHaveCount(0);
    await expect(jumpItemSummary(page, "Location")).toContainText(
        "Last Added DZ",
    );
    await expect(page.locator('input[name="exitAltitude"]')).toHaveValue(
        "3000",
    );
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("40");
});
