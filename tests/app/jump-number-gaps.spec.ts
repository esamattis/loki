import { acceptPrivacyPolicyIfRequired } from "./helpers";
import { expect, test, type Page } from "./fixtures";
import { expectLogbookAroundJump, openManageLogbook } from "./helpers";

const CSV_HEADER =
    "type,name,previousCount,jumpNumber,jumpDate,exitAltitude,openingAltitude,freefallTime,location,aircraft,gear,jumpTypes,description";

const fixtureCsv = [
    CSV_HEADER,
    "aircraft,Gap Plane,0,,,,,,,,,,",
    "gear,Gap Rig,0,,,,,,,,,,",
    "jumpType,Gap Type,0,,,,,,,,,,",
    "location,Gap Drop Zone,0,,,,,,,,,,",
    "jump,,,1,2021-06-15,4000,1000,55,Gap Drop Zone,Gap Plane,Gap Rig,Gap Type,First jump",
    "jump,,,2,2021-07-15,4000,1000,55,Gap Drop Zone,Gap Plane,Gap Rig,Gap Type,Second jump",
    "jump,,,5,2021-08-15,4000,1000,55,Gap Drop Zone,Gap Plane,Gap Rig,Gap Type,Fifth jump",
    "jump,,,8,2021-09-15,4000,1000,0,Gap Drop Zone,Gap Plane,Gap Rig,Gap Type,Incomplete eighth jump",
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

    await expect(
        page.getByRole("heading", { name: "Missing jumps #3 - #4" }),
    ).toBeVisible();
    await expect(
        page.getByRole("heading", { name: "Missing jumps #6 - #7" }),
    ).toBeVisible();
    for (const jumpNumber of [3, 4, 6, 7]) {
        await expect(
            page.getByRole("link", { name: `Add jump #${jumpNumber}` }),
        ).toBeVisible();
    }
    const upperGapCard = page.getByRole("listitem").filter({
        has: page.getByRole("link", { name: "Add jump #7" }),
    });
    await expect(upperGapCard).toContainText(
        "Add these jumps to fill the missing numbers in your logbook.",
    );
    await expect(upperGapCard).toContainText(
        "Renumbers jump #8 and every jump after it down by 2. No jump records will be deleted.",
    );
    await expect(
        upperGapCard.getByRole("link", { name: "Add jump #6" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Add jump #3" }).click();
    await expect(page).toHaveURL(/\/logbook\/jumps\/new\?.*jumpNumber=3/);
    await expect(page.locator('input[name="jumpNumber"]')).toHaveValue("3");

    await page.goto("/logbook");
    await page.getByRole("link", { name: "Statistics", exact: true }).click();
    await expect(page).toHaveURL("/logbook/statistics");
    await expect(page.getByText("Total jumps").locator("..")).toContainText(
        "8",
    );

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

    await page.goto("/logbook");
    const removableGapCard = page.getByRole("listitem").filter({
        has: page.getByRole("link", { name: "Add jump #7" }),
    });
    await removableGapCard.getByRole("button", { name: "Remove gaps" }).click();
    await removableGapCard
        .getByRole("button", { name: "Confirm remove gaps" })
        .click();
    await expect(page).toHaveURL("/logbook");
    await expect(page.getByRole("link", { name: "Add jump #7" })).toHaveCount(
        0,
    );
    await expect(page.getByRole("link", { name: "Add jump #6" })).toHaveCount(
        0,
    );
    await expect(page.getByRole("link", { name: /^#6 / })).toBeVisible();
    await expect(
        page.getByRole("heading", { name: "Missing jumps #3 - #4" }),
    ).toBeVisible();
    await expect(
        page.getByRole("heading", { name: /Missing jumps/ }),
    ).toHaveCount(1);
});

test("removing gaps keeps jump number low-first sort", async ({ page }) => {
    await registerUser(page, "jump-gaps-low-first");
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles({
        name: "jump-gaps-low-first.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(fixtureCsv),
    });
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 4 jumps")).toBeVisible();
    await page
        .getByRole("link", { name: /jump-gaps-low-first's logbook/ })
        .click();

    await page.getByLabel("Sort jumps").selectOption("Jump # · low first");
    await expect(page).toHaveURL(/sort=jumpNumber-asc/);
    const jumpLinks = page.getByRole("link", { name: /#\d+/ });
    await expect(jumpLinks.first()).toHaveAccessibleName(/^#1 /);

    const removableGapCard = page.getByRole("listitem").filter({
        has: page.getByRole("link", { name: "Add jump #7" }),
    });
    await expect(removableGapCard).toContainText(
        "Renumbers jump #8 and every jump after it down by 2. No jump records will be deleted.",
    );
    await removableGapCard.getByRole("button", { name: "Remove gaps" }).click();
    await removableGapCard
        .getByRole("button", { name: "Confirm remove gaps" })
        .click();

    await expect(page).toHaveURL(/\/logbook\?sort=jumpNumber-asc$/);
    await expect(jumpLinks.first()).toHaveAccessibleName(/^#1 /);
    await expect(page.getByRole("link", { name: "Add jump #7" })).toHaveCount(
        0,
    );
    await expect(page.getByRole("link", { name: "Add jump #6" })).toHaveCount(
        0,
    );
    await expect(page.getByRole("link", { name: /^#6 / })).toBeVisible();
    await expect(
        page.getByRole("heading", { name: "Missing jumps #3 - #4" }),
    ).toBeVisible();
    await expect(
        page.getByRole("heading", { name: /Missing jumps/ }),
    ).toHaveCount(1);
});

test("a jump can be saved without jump items and is listed as insufficient", async ({
    page,
}) => {
    await registerUser(page, "itemless-jump-skydiver");
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await page.getByRole("button", { name: "Add jump" }).click();

    await expectLogbookAroundJump(page, 1);
    const jump = page.getByRole("link", { name: /#1/ });
    await expect(jump.getByText("Not set", { exact: true })).toHaveCount(2);

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Statistics", exact: true }).click();
    const insufficientDataSection = page.locator("section").filter({
        has: page.getByRole("heading", {
            name: "Jumps with insufficient data",
        }),
    });
    await expect(insufficientDataSection.getByText("1 jump")).toBeVisible();
    await expect(
        insufficientDataSection.getByRole("link", { name: "#1" }),
    ).toBeVisible();
});

test("zero freefall time is allowed when exit and opening altitude match", async ({
    page,
}) => {
    await registerUser(page, "zero-ff-same-alt");
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles({
        name: "zero-ff-same-alt.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(
            [
                CSV_HEADER,
                "aircraft,Plane,0,,,,,,,,,,",
                "gear,Rig,0,,,,,,,,,,",
                "jumpType,Hop and Pop,0,,,,,,,,,,",
                "location,DZ,0,,,,,,,,,,",
                "jump,,,1,2021-06-15,1000,1000,0,DZ,Plane,Rig,Hop and Pop,Same altitude",
                "jump,,,2,2021-07-15,4000,1000,0,DZ,Plane,Rig,Hop and Pop,Missing freefall",
            ].join("\n"),
        ),
    });
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 2 jumps")).toBeVisible();

    await page
        .getByRole("link", { name: /zero-ff-same-alt's logbook/ })
        .click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Statistics", exact: true }).click();

    const insufficientDataSection = page.locator("section").filter({
        has: page.getByRole("heading", {
            name: "Jumps with insufficient data",
        }),
    });
    await expect(insufficientDataSection.getByText("1 jump")).toBeVisible();
    await expect(
        insufficientDataSection.getByRole("link", { name: "#2" }),
    ).toBeVisible();
    await expect(
        insufficientDataSection.getByRole("link", { name: "#1" }),
    ).toHaveCount(0);
});
