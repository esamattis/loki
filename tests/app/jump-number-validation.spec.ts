import { acceptPrivacyPolicyIfRequired } from "./helpers";
import type { TestInfo } from "@playwright/test";
import { expect, test, type Page } from "./fixtures";
import {
    expectLogbookAroundJump,
    openManageLogbook,
    selectJumpItems,
    setJumpNumber,
} from "./helpers";

async function registerUser(options: {
    page: Page;
    username: string;
    displayName: string;
    testInfo: TestInfo;
}) {
    const retrySuffix =
        options.testInfo.retry === 0 ? "" : `-${options.testInfo.retry}`;
    const uniqueUsername = `${options.username}${retrySuffix}`;
    await options.page.goto("/register");
    await options.page
        .locator('input[name="invitationCode"]')
        .fill("test-invite");
    await options.page.locator('input[name="username"]').fill(uniqueUsername);
    await options.page
        .locator('input[name="displayName"]')
        .fill(options.displayName);
    await options.page
        .locator('input[name="email"]')
        .fill(`${uniqueUsername}@example.test`);
    await options.page.locator('input[name="password"]').fill("parachute");
    await options.page
        .locator('input[name="confirmPassword"]')
        .fill("parachute");
    await options.page.getByRole("button", { name: "Create account" }).click();
    await acceptPrivacyPolicyIfRequired(options.page);
    await expect(options.page).toHaveURL("/logbook");
}

async function addLocationAndAircraft(
    page: Page,
    names: {
        displayName: string;
        locationName: string;
        aircraftName: string;
    },
) {
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page.getByRole("link", { name: "Add location" }).click();
    await page.locator('input[name="name"]').fill(names.locationName);
    await page.getByRole("button", { name: "Add location" }).click();

    await page
        .getByRole("link", {
            name: new RegExp(`${names.displayName}'s logbook`),
        })
        .click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page.getByRole("link", { name: "Add aircraft" }).click();
    await page.locator('input[name="name"]').fill(names.aircraftName);
    await page.getByRole("button", { name: "Add aircraft" }).click();

    await page
        .getByRole("link", {
            name: new RegExp(`${names.displayName}'s logbook`),
        })
        .click();
}

async function fillJumpBasics(
    page: Page,
    values: {
        jumpNumber: string;
        exitAltitude: string;
        openingAltitude: string;
        freefallTime: string;
        description: string;
        locationName: string;
        aircraftName: string;
    },
) {
    await setJumpNumber(page, values.jumpNumber);
    await page.locator('input[name="exitAltitude"]').fill(values.exitAltitude);
    await page
        .locator('input[name="openingAltitude"]')
        .fill(values.openingAltitude);
    await page.locator('input[name="freefallTime"]').fill(values.freefallTime);
    await page.locator('textarea[name="description"]').fill(values.description);
    await selectJumpItems(page, "Location", [values.locationName]);
    await selectJumpItems(page, "Aircraft", [values.aircraftName]);
}

async function importJumpsCsv(page: Page, csv: string, filename: string) {
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles({
        name: filename,
        mimeType: "text/csv",
        buffer: Buffer.from(csv),
    });
    await page.getByRole("button", { name: "Import logbook" }).click();
}

function jumpConflictSelect(page: Page) {
    return page.locator('select[name="jumpNumberConflict"]');
}

function jumpNumberLink(page: Page, jumpNumber: number) {
    return page.getByRole("link", { name: new RegExp(`^#${jumpNumber}\\b`) });
}

test("new jump page dynamically shows conflict options when jump number already exists", async ({
    page,
}, testInfo) => {
    await registerUser({
        page,
        username: "existing-jump-number-banner",
        displayName: "Existing Jump Banner",
        testInfo,
    });
    await addLocationAndAircraft(page, {
        displayName: "Existing Jump Banner",
        locationName: "Banner Drop Zone",
        aircraftName: "Banner Plane",
    });

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await fillJumpBasics(page, {
        jumpNumber: "357",
        exitAltitude: "4000",
        openingAltitude: "1000",
        freefallTime: "55",
        description: "Seed jump",
        locationName: "Banner Drop Zone",
        aircraftName: "Banner Plane",
    });
    await page.getByRole("button", { name: "Add jump" }).click();
    await expectLogbookAroundJump(page, 357);

    await page.goto("/logbook/jumps/new");
    const jumpNumber = page.locator('input[name="jumpNumber"]');
    const conflictNotice = page.getByText("Jump #357 already exists.");

    await setJumpNumber(page, "357");
    await expect(conflictNotice).toBeVisible();
    await expect(
        page.getByRole("link", { name: "Open existing jump" }),
    ).toBeVisible();
    await expect(jumpConflictSelect(page)).toBeVisible();
    await expect(
        jumpConflictSelect(page).getByRole("option", {
            name: "Replace existing jump",
        }),
    ).toBeAttached();
    await expect(
        jumpConflictSelect(page).getByRole("option", {
            name: "Shift existing and later jumps by +1",
        }),
    ).toBeAttached();

    await setJumpNumber(page, "123");
    await expect(conflictNotice).toBeHidden();
    await expect(jumpConflictSelect(page)).toHaveCount(0);

    await setJumpNumber(page, "357");
    await expect(conflictNotice).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(jumpNumber).toHaveValue("358");
    await expect(conflictNotice).toBeHidden();

    await setJumpNumber(page, "357");
    await expect(conflictNotice).toBeVisible();
    await page.getByRole("link", { name: "Open existing jump" }).click();
    await expect(page).toHaveURL(/\/logbook\/jumps\/.+/);
    await expect(page.locator('input[name="jumpNumber"]')).toHaveValue("357");
});

test("adding a jump with an existing jump number requires a conflict selection", async ({
    page,
}, testInfo) => {
    await registerUser({
        page,
        username: "conflict-required-add",
        displayName: "Conflict Required Add",
        testInfo,
    });
    await addLocationAndAircraft(page, {
        displayName: "Conflict Required Add",
        locationName: "Conflict Drop Zone",
        aircraftName: "Conflict Plane",
    });

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await fillJumpBasics(page, {
        jumpNumber: "1",
        exitAltitude: "4000",
        openingAltitude: "1000",
        freefallTime: "55",
        description: "Original jump",
        locationName: "Conflict Drop Zone",
        aircraftName: "Conflict Plane",
    });
    await page.getByRole("button", { name: "Add jump" }).click();
    await expectLogbookAroundJump(page, 1);

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await fillJumpBasics(page, {
        jumpNumber: "1",
        exitAltitude: "3500",
        openingAltitude: "900",
        freefallTime: "45",
        description: "Attempted jump",
        locationName: "Conflict Drop Zone",
        aircraftName: "Conflict Plane",
    });
    await expect(page.getByText("Jump #1 already exists.")).toBeVisible();
    await page.getByRole("button", { name: "Add jump" }).click();

    await expect(page).toHaveURL("/logbook/jumps/new");
    await expect(
        page.getByText("Choose how to handle the existing jump number"),
    ).toBeVisible();
    await expect(page.getByText("Jump #1 already exists.")).toBeVisible();
    await expect(jumpConflictSelect(page)).toBeVisible();
});

test("adding a jump can replace an existing jump number", async ({
    page,
}, testInfo) => {
    await registerUser({
        page,
        username: "overwrite-jump-number",
        displayName: "Overwrite Jumper",
        testInfo,
    });
    await addLocationAndAircraft(page, {
        displayName: "Overwrite Jumper",
        locationName: "Overwrite Drop Zone",
        aircraftName: "Overwrite Plane",
    });

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await fillJumpBasics(page, {
        jumpNumber: "1",
        exitAltitude: "4000",
        openingAltitude: "1000",
        freefallTime: "55",
        description: "Original jump",
        locationName: "Overwrite Drop Zone",
        aircraftName: "Overwrite Plane",
    });
    await page.getByRole("button", { name: "Add jump" }).click();
    await expectLogbookAroundJump(page, 1);
    await expect(page.getByText("Original jump")).toBeVisible();

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await fillJumpBasics(page, {
        jumpNumber: "1",
        exitAltitude: "3500",
        openingAltitude: "900",
        freefallTime: "45",
        description: "Replaced jump",
        locationName: "Overwrite Drop Zone",
        aircraftName: "Overwrite Plane",
    });
    await expect(page.getByText("Jump #1 already exists.")).toBeVisible();
    await jumpConflictSelect(page).selectOption("replace");
    await page.getByRole("button", { name: "Add jump" }).click();

    await expectLogbookAroundJump(page, 1);
    await expect(jumpNumberLink(page, 1)).toHaveCount(1);
    await expect(page.getByText("Replaced jump")).toBeVisible();
    await expect(page.getByText("Original jump")).toHaveCount(0);
    await expect(page.getByText(/3\s500 m/, { exact: true })).toBeVisible();
    await expect(page.getByText(/900 m/, { exact: true })).toBeVisible();
    await expect(
        jumpNumberLink(page, 1).getByText("45s", { exact: true }),
    ).toBeVisible();
});

test("adding a jump can shift existing and later jumps by +1", async ({
    page,
}, testInfo) => {
    await registerUser({
        page,
        username: "shift-on-add",
        displayName: "Shift On Add",
        testInfo,
    });
    const csv = [
        "type,name,previousCount,jumpNumber,jumpDate,exitAltitude,openingAltitude,freefallTime,location,aircraft,gear,jumpTypes,description",
        "aircraft,Shift Plane,0,,,,,,,,,,",
        "location,Shift Drop Zone,0,,,,,,,,,,",
        "jump,,,1,2021-06-15,4000,1000,55,Shift Drop Zone,Shift Plane,,,Jump one",
        "jump,,,2,2021-07-15,4000,1000,55,Shift Drop Zone,Shift Plane,,,Jump two",
        "jump,,,3,2021-08-15,4000,1000,55,Shift Drop Zone,Shift Plane,,,Jump three",
    ].join("\n");
    await importJumpsCsv(page, csv, "shift-on-add.csv");
    await expect(page.getByText("Imported 3 jumps")).toBeVisible();
    await page.getByRole("link", { name: /Shift On Add's logbook/ }).click();

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await fillJumpBasics(page, {
        jumpNumber: "2",
        exitAltitude: "3500",
        openingAltitude: "900",
        freefallTime: "40",
        description: "Inserted jump",
        locationName: "Shift Drop Zone",
        aircraftName: "Shift Plane",
    });
    await expect(page.getByText("Jump #2 already exists.")).toBeVisible();
    await jumpConflictSelect(page).selectOption("shift");
    await page.getByRole("button", { name: "Add jump" }).click();

    await expectLogbookAroundJump(page, 2);
    await expect(jumpNumberLink(page, 1)).toHaveCount(1);
    await expect(jumpNumberLink(page, 2)).toHaveCount(1);
    await expect(jumpNumberLink(page, 3)).toHaveCount(1);
    await expect(jumpNumberLink(page, 4)).toHaveCount(1);
    await expect(page.getByText("Jump one")).toBeVisible();
    await expect(page.getByText("Inserted jump")).toBeVisible();
    await expect(page.getByText("Jump two")).toBeVisible();
    await expect(page.getByText("Jump three")).toBeVisible();

    await jumpNumberLink(page, 2).click();
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "Inserted jump",
    );
    await page.goto("/logbook");
    await jumpNumberLink(page, 3).click();
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "Jump two",
    );
    await page.goto("/logbook");
    await jumpNumberLink(page, 4).click();
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "Jump three",
    );
});

test("edit jump page dynamically shows conflict options when jump number already exists", async ({
    page,
}, testInfo) => {
    await registerUser({
        page,
        username: "edit-conflict-banner",
        displayName: "Edit Conflict Banner",
        testInfo,
    });
    const csv = [
        "type,name,previousCount,jumpNumber,jumpDate,exitAltitude,openingAltitude,freefallTime,location,aircraft,gear,jumpTypes,description",
        "aircraft,Edit Banner Plane,0,,,,,,,,,,",
        "location,Edit Banner Drop Zone,0,,,,,,,,,,",
        "jump,,,1,2021-06-15,4000,1000,55,Edit Banner Drop Zone,Edit Banner Plane,,,First",
        "jump,,,2,2021-07-15,4000,1000,55,Edit Banner Drop Zone,Edit Banner Plane,,,Second",
    ].join("\n");
    await importJumpsCsv(page, csv, "edit-conflict-banner.csv");
    await expect(page.getByText("Imported 2 jumps")).toBeVisible();
    await page
        .getByRole("link", { name: /Edit Conflict Banner's logbook/ })
        .click();

    await jumpNumberLink(page, 2).click();
    await setJumpNumber(page, "1");
    await expect(page.getByText("Jump #1 already exists.")).toBeVisible();
    await expect(jumpConflictSelect(page)).toBeVisible();
    await expect(
        page.getByRole("link", { name: "Open existing jump" }),
    ).toBeVisible();

    await setJumpNumber(page, "2");
    await expect(page.getByText("Jump #1 already exists.")).toBeHidden();
    await expect(jumpConflictSelect(page)).toHaveCount(0);
});

test("editing a jump with an existing jump number requires a conflict selection", async ({
    page,
}, testInfo) => {
    await registerUser({
        page,
        username: "conflict-required-edit",
        displayName: "Conflict Required Edit",
        testInfo,
    });
    const csv = [
        "type,name,previousCount,jumpNumber,jumpDate,exitAltitude,openingAltitude,freefallTime,location,aircraft,gear,jumpTypes,description",
        "aircraft,Required Plane,0,,,,,,,,,,",
        "location,Required Drop Zone,0,,,,,,,,,,",
        "jump,,,1,2021-06-15,4000,1000,55,Required Drop Zone,Required Plane,,,First",
        "jump,,,2,2021-07-15,4000,1000,55,Required Drop Zone,Required Plane,,,Second",
    ].join("\n");
    await importJumpsCsv(page, csv, "conflict-required-edit.csv");
    await expect(page.getByText("Imported 2 jumps")).toBeVisible();
    await page
        .getByRole("link", { name: /Conflict Required Edit's logbook/ })
        .click();

    await jumpNumberLink(page, 2).click();
    await setJumpNumber(page, "1");
    await page.locator('textarea[name="description"]').fill("Attempted edit");
    await page.getByRole("button", { name: "Save jump" }).click();

    await expect(page).toHaveURL(/\/logbook\/jumps\//);
    await expect(
        page.getByText("Choose how to handle the existing jump number"),
    ).toBeVisible();
    await expect(page.getByText("Jump #1 already exists.")).toBeVisible();
    await expect(jumpConflictSelect(page)).toBeVisible();
});

test("editing a jump can replace another jump with the same number", async ({
    page,
}, testInfo) => {
    await registerUser({
        page,
        username: "replace-on-edit",
        displayName: "Replace On Edit",
        testInfo,
    });
    const csv = [
        "type,name,previousCount,jumpNumber,jumpDate,exitAltitude,openingAltitude,freefallTime,location,aircraft,gear,jumpTypes,description",
        "aircraft,Replace Plane,0,,,,,,,,,,",
        "location,Replace Drop Zone,0,,,,,,,,,,",
        "jump,,,1,2021-06-15,4000,1000,55,Replace Drop Zone,Replace Plane,,,Keep me",
        "jump,,,2,2021-07-15,3500,900,45,Replace Drop Zone,Replace Plane,,,Move onto one",
        "jump,,,3,2021-08-15,3000,800,35,Replace Drop Zone,Replace Plane,,,Stay three",
    ].join("\n");
    await importJumpsCsv(page, csv, "replace-on-edit.csv");
    await expect(page.getByText("Imported 3 jumps")).toBeVisible();
    await page.getByRole("link", { name: /Replace On Edit's logbook/ }).click();

    await jumpNumberLink(page, 2).click();
    await setJumpNumber(page, "1");
    await page
        .locator('textarea[name="description"]')
        .fill("Replaced via edit");
    await expect(page.getByText("Jump #1 already exists.")).toBeVisible();
    await jumpConflictSelect(page).selectOption("replace");
    await page.getByRole("button", { name: "Save jump" }).click();

    await expectLogbookAroundJump(page, 1);
    await expect(jumpNumberLink(page, 1)).toHaveCount(1);
    await expect(jumpNumberLink(page, 2)).toHaveCount(0);
    await expect(jumpNumberLink(page, 3)).toHaveCount(1);
    await expect(page.getByText("Replaced via edit")).toBeVisible();
    await expect(page.getByText("Keep me")).toHaveCount(0);
    await expect(page.getByText("Move onto one")).toHaveCount(0);
    await expect(page.getByText("Stay three")).toBeVisible();
});

test("editing a jump can shift existing and later jumps by +1", async ({
    page,
}, testInfo) => {
    await registerUser({
        page,
        username: "shift-on-edit",
        displayName: "Shift On Edit",
        testInfo,
    });
    const csv = [
        "type,name,previousCount,jumpNumber,jumpDate,exitAltitude,openingAltitude,freefallTime,location,aircraft,gear,jumpTypes,description",
        "aircraft,Edit Shift Plane,0,,,,,,,,,,",
        "location,Edit Shift Drop Zone,0,,,,,,,,,,",
        "jump,,,1,2021-06-15,4000,1000,55,Edit Shift Drop Zone,Edit Shift Plane,,,Jump one",
        "jump,,,2,2021-07-15,4000,1000,55,Edit Shift Drop Zone,Edit Shift Plane,,,Jump two",
        "jump,,,5,2021-08-15,4000,1000,55,Edit Shift Drop Zone,Edit Shift Plane,,,Jump five",
    ].join("\n");
    await importJumpsCsv(page, csv, "shift-on-edit.csv");
    await expect(page.getByText("Imported 3 jumps")).toBeVisible();
    await page.getByRole("link", { name: /Shift On Edit's logbook/ }).click();

    await jumpNumberLink(page, 5).click();
    await setJumpNumber(page, "2");
    await page.locator('textarea[name="description"]').fill("Moved to two");
    await expect(page.getByText("Jump #2 already exists.")).toBeVisible();
    await jumpConflictSelect(page).selectOption("shift");
    await page.getByRole("button", { name: "Save jump" }).click();

    await expectLogbookAroundJump(page, 2);
    await expect(jumpNumberLink(page, 1)).toHaveCount(1);
    await expect(jumpNumberLink(page, 2)).toHaveCount(1);
    await expect(jumpNumberLink(page, 3)).toHaveCount(1);
    await expect(jumpNumberLink(page, 5)).toHaveCount(0);
    await expect(page.getByText("Jump one")).toBeVisible();
    await expect(page.getByText("Moved to two")).toBeVisible();
    await expect(page.getByText("Jump two")).toBeVisible();

    await jumpNumberLink(page, 2).click();
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "Moved to two",
    );
    await page.goto("/logbook");
    await jumpNumberLink(page, 3).click();
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "Jump two",
    );
});

test("editing a jump without a number conflict does not show conflict options", async ({
    page,
}, testInfo) => {
    await registerUser({
        page,
        username: "no-conflict-edit",
        displayName: "No Conflict Edit",
        testInfo,
    });
    const csv = [
        "type,name,previousCount,jumpNumber,jumpDate,exitAltitude,openingAltitude,freefallTime,location,aircraft,gear,jumpTypes,description",
        "aircraft,No Conflict Plane,0,,,,,,,,,,",
        "location,No Conflict Drop Zone,0,,,,,,,,,,",
        "jump,,,1,2021-06-15,4000,1000,55,No Conflict Drop Zone,No Conflict Plane,,,Only jump",
    ].join("\n");
    await importJumpsCsv(page, csv, "no-conflict-edit.csv");
    await expect(page.getByText("Imported 1 jump")).toBeVisible();
    await page
        .getByRole("link", { name: /No Conflict Edit's logbook/ })
        .click();

    await jumpNumberLink(page, 1).click();
    await setJumpNumber(page, "9");
    await page.locator('textarea[name="description"]').fill("Renumbered");
    await expect(jumpConflictSelect(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Save jump" }).click();

    await expectLogbookAroundJump(page, 9);
    await expect(jumpNumberLink(page, 9)).toHaveCount(1);
    await expect(page.getByText("Renumbered")).toBeVisible();
});
