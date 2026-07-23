import { expect, test, type Page } from "./fixtures";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
    acceptPrivacyPolicyIfRequired,
    executePlaywrightDb,
    jumpItemSummary,
    logOut,
    openManageLogbook,
    queryPlaywrightDb,
} from "./helpers";

const fixturePath = path.join(import.meta.dirname, "fixtures/logbook.csv");
const roundTripFixturePath = path.join(
    import.meta.dirname,
    "fixtures/logbook-round-trip.csv",
);
const xmlFixturePath = path.join(
    import.meta.dirname,
    "fixtures/skydiving-logbook.xml",
);
const xmlCutawayTypeFixturePath = path.join(
    import.meta.dirname,
    "fixtures/skydiving-logbook-cutaway-type.xml",
);
const xmlCutawayNoTypeFixturePath = path.join(
    import.meta.dirname,
    "fixtures/skydiving-logbook-cutaway-no-type.xml",
);

const CSV_HEADER =
    "type,name,previousCount,jumpNumber,jumpDate,exitAltitude,openingAltitude,freefallTime,location,aircraft,gear,jumpTypes,description";

function basicAuthHeader(username: string, password: string): string {
    return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
}

function csvJumpRow(options: {
    jumpNumber: number;
    exitAltitude?: number;
    openingAltitude?: number;
    freefallTime?: number;
    location?: string;
    aircraft?: string;
    gear?: string;
    jumpTypes?: string;
    description?: string;
}): string {
    return [
        "jump",
        "",
        "",
        options.jumpNumber,
        "",
        options.exitAltitude ?? "",
        options.openingAltitude ?? "",
        options.freefallTime ?? "",
        options.location ?? "",
        options.aircraft ?? "",
        options.gear ?? "",
        options.jumpTypes ?? "",
        options.description ?? "",
    ].join(",");
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

test("dropping a logbook file anywhere on the import page selects it", async ({
    page,
}) => {
    await registerUser(page, "drop-import-skydiver");
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await expect(page).toHaveURL("/logbook/transfer");

    const importButton = page.getByRole("button", { name: "Import logbook" });
    await expect(importButton).not.toHaveClass(/bg-indigo-600/);

    const csv = await readFile(fixturePath);
    await page.evaluate(async (bytes) => {
        const file = new File([new Uint8Array(bytes)], "logbook.csv", {
            type: "text/csv",
        });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        window.dispatchEvent(
            new DragEvent("dragenter", {
                bubbles: true,
                cancelable: true,
                dataTransfer,
            }),
        );
        window.dispatchEvent(
            new DragEvent("drop", {
                bubbles: true,
                cancelable: true,
                dataTransfer,
            }),
        );
    }, Array.from(csv));

    await expect(page.locator('input[name="file"]')).toHaveValue(
        /logbook\.csv$/,
    );
    await expect(importButton).toHaveClass(/bg-indigo-600/);
    await expect(page.getByText("Imported 2 jumps")).toHaveCount(0);

    await importButton.click();
    await expect(page.getByText("Imported 2 jumps")).toBeVisible();
});

test("saving a record jump returns to yearly statistics", async ({ page }) => {
    await registerUser(page, "record-jump-return");
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles(fixturePath);
    await page.getByRole("button", { name: "Import logbook" }).click();

    await page
        .getByRole("link", { name: /record-jump-return's logbook/ })
        .click();
    await page.getByRole("link", { name: "Statistics", exact: true }).click();
    await page.getByRole("link", { name: "View yearly statistics" }).click();
    const currentYear = new Date().getUTCFullYear();
    await page
        .getByRole("link", { name: String(currentYear), exact: true })
        .click();
    const yearlyStatisticsUrl = `/logbook/statistics/detailed?year=${currentYear}`;
    await expect(page).toHaveURL(yearlyStatisticsUrl);

    await page
        .getByText("Longest freefall time")
        .locator("..")
        .getByRole("link")
        .click();
    await expect(page).toHaveURL(/\/logbook\/jumps\/.+/);
    await page.locator('textarea[name="description"]').fill("Updated record");
    await page.getByRole("button", { name: "Save jump" }).click();

    await expect(page).toHaveURL(yearlyStatisticsUrl);
    await expect(
        page.getByRole("heading", {
            name: `Jumps from ${currentYear}`,
            exact: true,
        }),
    ).toBeVisible();
});

test("statistics show total and recorded jump counts for every item", async ({
    page,
}) => {
    await registerUser(page, "statistics-skydiver");
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    const csv = (await readFile(fixturePath, "utf8")).replaceAll(
        ",Navigator 260,Formation skydiving",
        ",Navigator 260; New rig,Formation skydiving",
    );
    await page.locator('input[name="file"]').setInputFiles({
        name: "logbook.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(csv),
    });
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 2 jumps")).toBeVisible();

    await page
        .getByRole("link", { name: /statistics-skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: "Statistics", exact: true }).click();

    await expect(page).toHaveURL("/logbook/statistics");
    await expect(
        page.getByRole("heading", { name: "Statistics" }),
    ).toBeVisible();
    await expect(page.getByText("Total jumps").locator("..")).toContainText(
        "2",
    );
    await expect(page.getByText("Jumps this year").locator("..")).toContainText(
        "2",
    );
    await expect(
        page.getByText("Jumps in the last 12 months").locator(".."),
    ).toContainText("2");
    await expect(
        page.getByText("Jumps last month").locator(".."),
    ).toContainText("0");
    await page.getByRole("link", { name: "View yearly statistics" }).click();

    await expect(page).toHaveURL("/logbook/statistics/detailed");
    await expect(
        page.getByRole("heading", { name: "Yearly statistics" }),
    ).toBeVisible();
    await expect(
        page.getByRole("heading", { name: "All Time", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Showing all years")).toHaveCount(0);
    await expect(
        page.getByText("Total freefall time").locator(".."),
    ).toContainText("1min 43s");
    await expect(
        page.getByText("Total freefall distance").locator(".."),
    ).toContainText("6 km");
    await expect(
        page.getByText("Longest freefall distance").locator(".."),
    ).toContainText("3 km");
    await expect(
        page.getByText("Fastest average freefall speed").locator(".."),
    ).toContainText("Jump #301");
    await expect(
        page.getByText("Slowest average freefall speed").locator(".."),
    ).toContainText("Jump #302");
    await expect(
        page.getByText(/only include jumps with more than/),
    ).toContainText("2,000 m of freefall");
    const mostJumpsDay = page.getByText("Most jumps in a day").locator("..");
    await expect(mostJumpsDay).toContainText("2 jumps");
    const mostJumpsDayLink = mostJumpsDay.getByRole("link");
    const mostJumpsDayHref = await mostJumpsDayLink.getAttribute("href");
    if (!mostJumpsDayHref) throw new Error("Most jumps day link has no href");
    const mostJumpsDayUrl = new URL(mostJumpsDayHref, page.url());
    const mostJumpsDate = mostJumpsDayUrl.searchParams.get("start");
    expect(mostJumpsDayUrl.pathname).toBe("/logbook");
    expect(mostJumpsDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(mostJumpsDayUrl.searchParams.get("end")).toBe(mostJumpsDate);

    for (const label of ["Most jumps in a week", "Most jumps in a month"]) {
        const record = page.getByText(label).locator("..");
        await expect(record).toContainText("2 jumps");
        const href = await record.getByRole("link").getAttribute("href");
        if (!href) throw new Error(`${label} link has no href`);
        const url = new URL(href, page.url());
        expect(url.pathname).toBe("/logbook");
        expect(url.searchParams.get("start")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(url.searchParams.get("end")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }

    await mostJumpsDayLink.click();
    await expect(page).toHaveURL(mostJumpsDayUrl.toString());
    await expect(page.getByRole("textbox", { name: "Start date" })).toHaveValue(
        mostJumpsDate!,
    );
    await expect(page.getByRole("textbox", { name: "End date" })).toHaveValue(
        mostJumpsDate!,
    );
    await expect(page.getByRole("link", { name: /#301/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /#302/ })).toBeVisible();
    await page.goBack();
    await expect(
        page.getByRole("heading", { name: "Yearly statistics" }),
    ).toBeVisible();
    const locationRow = page
        .getByRole("row")
        .filter({ hasText: "Skydive Example" });
    await expect(
        locationRow.locator(
            '[data-loki-tooltip="Total usage count, including previous usage"]',
        ),
    ).toHaveText("302");
    await expect(
        locationRow.locator(
            '[data-loki-tooltip="Usage count from recorded jumps"]',
        ),
    ).toHaveText("(2)");
    const newGearRow = page.getByRole("row").filter({ hasText: "New rig" });
    await expect(newGearRow).toContainText("2");
    await expect(newGearRow).not.toContainText("(");
    await expect(
        newGearRow.locator(
            '[data-loki-tooltip="Usage count from recorded jumps"]',
        ),
    ).toHaveCount(0);
    await expect(
        page.getByRole("row").filter({ hasText: "Twin Otter" }),
    ).toContainText("122");
    await expect(
        page.getByRole("row").filter({ hasText: "Navigator 260" }),
    ).toContainText("44");
    await expect(
        page.getByRole("row").filter({ hasText: "Formation skydiving" }),
    ).toContainText("20");
    const currentYear = new Date().getUTCFullYear();
    await page
        .getByRole("link", { name: String(currentYear), exact: true })
        .click();
    await expect(page).toHaveURL(
        `/logbook/statistics/detailed?year=${currentYear}`,
    );
    await expect(
        page.getByRole("heading", {
            name: `Jumps from ${currentYear}`,
            exact: true,
        }),
    ).toBeVisible();
    await expect(page.getByText(`Showing ${currentYear}`)).toHaveCount(0);
    await expect(
        page.getByText(`Showing jumps recorded in ${currentYear}.`),
    ).toHaveCount(0);
});

test("a CSV jump can omit optional measurements and jump items", async ({
    page,
}) => {
    await registerUser(page, "optional-import-skydiver");
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles({
        name: "optional-fields.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(
            [CSV_HEADER, csvJumpRow({ jumpNumber: 7 })].join("\n") + "\n",
        ),
    });
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 1 jump")).toBeVisible();

    await page
        .getByRole("link", { name: /optional-import-skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: /#7/ }).click();
    await expect(page.locator('input[name="exitAltitude"]')).toHaveValue("");
    await expect(page.locator('input[name="openingAltitude"]')).toHaveValue("");
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("");
    await expect(jumpItemSummary(page, "Location")).toHaveText("None selected");
    await expect(jumpItemSummary(page, "Aircraft")).toHaveText("None selected");
    await expect(jumpItemSummary(page, "Gear used")).toHaveText(
        "None selected",
    );
});

test("a CSV jump can use zero for optional measurements", async ({ page }) => {
    await registerUser(page, "zero-measurements-skydiver");
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles({
        name: "zero-measurements.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(
            [
                CSV_HEADER,
                csvJumpRow({
                    jumpNumber: 3,
                    exitAltitude: 0,
                    openingAltitude: 0,
                    freefallTime: 0,
                }),
            ].join("\n") + "\n",
        ),
    });
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 1 jump")).toBeVisible();
    await expect(
        page.getByText("Exit altitude cannot be negative"),
    ).toHaveCount(0);
    await expect(page.getByText("Exit altitude must be positive")).toHaveCount(
        0,
    );

    await page
        .getByRole("link", { name: /zero-measurements-skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: /#3/ }).click();
    await expect(page.locator('input[name="exitAltitude"]')).toHaveValue("");
    await expect(page.locator('input[name="openingAltitude"]')).toHaveValue("");
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("");
});

test("the logbook reminds users to export changed data every month", async ({
    page,
}) => {
    const username = "backup-reminder-skydiver";
    const reminder = page.getByRole("heading", {
        name: "Back up your logbook",
    });
    await registerUser(page, username);
    await expect(reminder).toHaveCount(0);

    for (const jumpNumber of [1, 2]) {
        await page.goto("/logbook/transfer");
        await page.locator('input[name="file"]').setInputFiles({
            name: `jump-${jumpNumber}.csv`,
            mimeType: "text/csv",
            buffer: Buffer.from(
                [CSV_HEADER, csvJumpRow({ jumpNumber })].join("\n") + "\n",
            ),
        });
        await page.getByRole("button", { name: "Import logbook" }).click();
        await page
            .getByRole("link", { name: new RegExp(`${username}'s logbook`) })
            .click();
        await expect(reminder).toHaveCount(jumpNumber === 1 ? 0 : 1);
    }

    const exportLink = page.getByRole("link", { name: "Export logbook" });
    await expect(exportLink).toHaveAttribute("href", "/logbook/export");
    await expect(exportLink).toHaveAttribute("download", "");
    const downloadPromise = page.waitForEvent("download");
    await exportLink.click();
    await downloadPromise;
    await page.reload();
    await expect(reminder).toHaveCount(0);

    const optionRows = await queryPlaywrightDb(`
        SELECT json_extract(options, '$.lastCsvExportAt') AS lastCsvExportAt
        FROM users
        WHERE username = '${username}'
    `);
    expect(optionRows[0]?.lastCsvExportAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    const jumpRows = await queryPlaywrightDb(`
        SELECT max(created_at) AS latestJumpCreatedAt
        FROM jumps
        WHERE user_uuid = (
            SELECT uuid FROM users WHERE username = '${username}'
        )
    `);
    expect(jumpRows[0]?.latestJumpCreatedAt).toBeGreaterThan(
        Date.parse("2020-01-01T00:00:00.000Z") / 1_000,
    );

    await executePlaywrightDb(`
        UPDATE users
        SET options = json_set(options, '$.lastCsvExportAt', '2020-01-01T00:00:00.000Z'),
            html_cache_generation = html_cache_generation + 1
        WHERE username = '${username}'
    `);
    await page.reload();
    await expect(reminder).toBeVisible();

    await executePlaywrightDb(`
        UPDATE users
        SET options = json_set(options, '$.lastCsvExportAt', '2099-01-01T00:00:00.000Z'),
            html_cache_generation = html_cache_generation + 1
        WHERE username = '${username}'
    `);
    await page.reload();
    await expect(reminder).toHaveCount(0);
});

test("the logbook does not show the CSV backup reminder for read-only users", async ({
    page,
}) => {
    const username = "backup-reminder-readonly";
    const reminder = page.getByRole("heading", {
        name: "Back up your logbook",
    });
    await registerUser(page, username);

    for (const jumpNumber of [1, 2]) {
        await page.goto("/logbook/transfer");
        await page.locator('input[name="file"]').setInputFiles({
            name: `jump-${jumpNumber}.csv`,
            mimeType: "text/csv",
            buffer: Buffer.from(
                [CSV_HEADER, csvJumpRow({ jumpNumber })].join("\n") + "\n",
            ),
        });
        await page.getByRole("button", { name: "Import logbook" }).click();
        await page
            .getByRole("link", { name: new RegExp(`${username}'s logbook`) })
            .click();
    }
    await expect(reminder).toBeVisible();

    await executePlaywrightDb(`
        UPDATE users
        SET options = json_set(options, '$.readonly', json('true')),
            html_cache_generation = html_cache_generation + 1
        WHERE username = '${username}'
    `);
    await page.reload();
    await expect(reminder).toHaveCount(0);
});

test("an exported logbook file preserves jumps and jump items when imported", async ({
    page,
}) => {
    await registerUser(page, "first-skydiver");

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page
        .locator('input[name="file"]')
        .setInputFiles(roundTripFixturePath);
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 2 jumps")).toBeVisible();

    await page.getByRole("link", { name: /first-skydiver's logbook/ }).click();
    await expect(page.getByRole("link", { name: /#301/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /#302/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /#\d+/ })).toHaveCount(2);
    await page.getByRole("link", { name: /#301/ }).click();
    await page
        .locator('textarea[name="description"]')
        .fill("Edited after import\nSecond line");
    await page.getByRole("button", { name: "Save jump" }).click();
    await expect(
        page.getByText(/Edited after import\s+Second line/),
    ).toBeVisible();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    const downloadPromise = page.waitForEvent("download");
    const exportLink = page.getByRole("link", { name: "Export logbook" });
    await expect(exportLink).toHaveAttribute("download", "");
    await exportLink.click();
    await expect(page.locator("#form-submit-progress")).toBeVisible();
    const download = await downloadPromise;
    await expect(page.locator("#form-submit-progress")).toHaveCount(0);
    await expect(page.locator(".form-submit-spinner")).toHaveCount(0);
    const exportPath = await download.path();
    if (!exportPath) {
        throw new Error("The export download has no file path");
    }
    const exportContents = await readFile(exportPath, "utf8");
    expect(exportContents).not.toMatch(/uuid/i);
    expect(exportContents).toContain(CSV_HEADER);
    expect(exportContents).toContain("Twin Otter");
    expect(exportContents).toContain("Grand Caravan");
    expect(exportContents).toContain("Navigator 260");
    expect(exportContents).toContain("Vector 3");
    expect(exportContents).toContain("Skydive Example");
    expect(exportContents).toContain("Coastal Drop Zone");
    expect(exportContents).toContain("Formation skydiving");
    expect(exportContents).toContain("Wingsuit");
    expect(exportContents).toContain("Accuracy landing");
    expect(exportContents).toContain(",4000,1000,55,");
    await logOut(page);
    await registerUser(page, "second-skydiver");

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles(exportPath);
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 2 jumps")).toBeVisible();

    await page.getByRole("link", { name: /second-skydiver's logbook/ }).click();
    await expect(page.getByRole("link", { name: /#301/ })).toContainText(
        "Skydive Example",
    );
    const secondImportedJump = page.getByRole("link", { name: /#302/ });
    await expect(secondImportedJump).toContainText("Coastal Drop Zone");
    await expect(secondImportedJump).toContainText("Grand Caravan");
    await expect(page.getByRole("link", { name: /#\d+/ })).toHaveCount(2);
    await page.getByRole("link", { name: /#301/ }).click();
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "Edited after import\nSecond line",
    );
    await expect(page.locator('input[name="exitAltitude"]')).toHaveValue(
        "4000",
    );
    await expect(page.locator('input[name="openingAltitude"]')).toHaveValue(
        "1000",
    );
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("55");
    await expect(jumpItemSummary(page, "Gear used")).toContainText(
        "Navigator 260",
    );
    await expect(jumpItemSummary(page, "Gear used")).toContainText("Vector 3");
    await expect(jumpItemSummary(page, "Aircraft")).toContainText("Twin Otter");
    await expect(jumpItemSummary(page, "Aircraft")).toContainText(
        "Grand Caravan",
    );
    await expect(jumpItemSummary(page, "Location")).toContainText(
        "Skydive Example",
    );
    await expect(jumpItemSummary(page, "Jump types")).toContainText(
        "Formation skydiving",
    );
    await expect(jumpItemSummary(page, "Jump types")).toContainText("Wingsuit");

    await page.getByRole("link", { name: /second-skydiver's logbook/ }).click();
    await page.getByRole("link", { name: /#302/ }).click();
    await expect(jumpItemSummary(page, "Location")).toContainText(
        "Coastal Drop Zone",
    );
    await expect(jumpItemSummary(page, "Aircraft")).toContainText(
        "Grand Caravan",
    );
    await expect(jumpItemSummary(page, "Gear used")).toContainText("Vector 3");
    await expect(jumpItemSummary(page, "Jump types")).toContainText("Wingsuit");

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage jump types" }).click();
    await expect(
        page.getByText("Accuracy landing", { exact: true }),
    ).toBeVisible();
});

test("clearing all previous data replaces the entire logbook during import", async ({
    page,
}) => {
    await registerUser(page, "clear-all-import-skydiver");
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles(fixturePath);
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 2 jumps")).toBeVisible();

    await page.locator('input[name="file"]').setInputFiles({
        name: "replacement-logbook.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(
            [
                CSV_HEADER,
                csvJumpRow({
                    jumpNumber: 1,
                    exitAltitude: 3000,
                    openingAltitude: 800,
                    freefallTime: 45,
                    location: "Replacement drop zone",
                    aircraft: "Replacement aircraft",
                    gear: "Replacement gear",
                    jumpTypes: "Replacement jump type",
                }),
            ].join("\n") + "\n",
        ),
    });
    await page
        .getByRole("checkbox", { name: "Clear all previous data" })
        .check();
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 1 jump")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Export logbook" }).click();
    const download = await downloadPromise;
    const exportPath = await download.path();
    if (!exportPath) {
        throw new Error("The export download has no file path");
    }
    const exportContents = await readFile(exportPath, "utf8");
    expect(exportContents).toContain(",1,");
    expect(exportContents).toContain("Replacement gear");
    expect(exportContents).toContain("Replacement jump type");
    expect(exportContents).toContain("Replacement drop zone");
    expect(exportContents).toContain("Replacement aircraft");
    expect(exportContents).not.toContain("Twin Otter");
    expect(exportContents).not.toContain("Navigator 260");
    expect(exportContents).not.toContain("Formation skydiving");
    expect(exportContents).not.toContain("Skydive Example");
});

test("a Skydiving Logbook XML file can be imported", async ({ page }) => {
    await registerUser(page, "xml-skydiver");
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles(xmlFixturePath);
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 1 jump")).toBeVisible();

    await page.getByRole("link", { name: /xml-skydiver's logbook/ }).click();
    const importedJump = page.getByRole("link", { name: /#401/ });
    await expect(importedJump).toContainText("Skydive XML");
    await expect(importedJump).toContainText("Caravan");
    await expect(importedJump).toContainText("2024-06-15");
    await importedJump.click();
    await expect(page.locator("[data-loki-jump-date-input]")).toHaveValue(
        "2024-06-15",
    );
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "Imported from XML",
    );
    await expect(jumpItemSummary(page, "Gear used")).toContainText("XML Rig");
    await expect(jumpItemSummary(page, "Jump types")).toContainText("Freefly");
});

test("a cutaway jump adds the Cutaway type when the type exists in XML", async ({
    page,
}) => {
    await registerUser(page, "cutaway-type-skydiver");
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page
        .locator('input[name="file"]')
        .setInputFiles(xmlCutawayTypeFixturePath);
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 1 jump")).toBeVisible();

    await page
        .getByRole("link", { name: /cutaway-type-skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: /#401/ }).click();
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "Imported from XML",
    );
    await expect(jumpItemSummary(page, "Jump types")).toContainText("Freefly");
    await expect(jumpItemSummary(page, "Jump types")).toContainText("Cutaway");
});

test("a cutaway jump creates and assigns the Cutaway type when XML is missing it", async ({
    page,
}) => {
    await registerUser(page, "cutaway-no-type-skydiver");
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page
        .locator('input[name="file"]')
        .setInputFiles(xmlCutawayNoTypeFixturePath);
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 1 jump")).toBeVisible();

    await page
        .getByRole("link", { name: /cutaway-no-type-skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: /#401/ }).click();
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "Imported from XML",
    );
    await expect(jumpItemSummary(page, "Jump types")).toContainText("Freefly");
    await expect(jumpItemSummary(page, "Jump types")).toContainText("Cutaway");
});

test("an import deduplicates repeated gear and jump type references", async ({
    page,
}) => {
    await registerUser(page, "deduplicated-import-skydiver");
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles({
        name: "duplicated-references.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(
            [
                CSV_HEADER,
                csvJumpRow({
                    jumpNumber: 1,
                    exitAltitude: 4000,
                    openingAltitude: 1000,
                    freefallTime: 60,
                    location: "Test location",
                    aircraft: "Test aircraft",
                    gear: "Test rig; test rig",
                    jumpTypes: "Test type; test type",
                }),
            ].join("\n") + "\n",
        ),
    });
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 1 jump")).toBeVisible();

    await page
        .getByRole("link", { name: /deduplicated-import-skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: /#1/ }).click();
    await expect(jumpItemSummary(page, "Gear used")).toContainText("Test rig");
    await expect(jumpItemSummary(page, "Jump types")).toContainText(
        "Test type",
    );
});

test("CSV import creates unknown jump items and handles double-escaped semicolons", async ({
    page,
}) => {
    await registerUser(page, "csv-semicolon-skydiver");
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles({
        name: "semicolon-gear.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(
            [
                CSV_HEADER,
                csvJumpRow({
                    jumpNumber: 10,
                    exitAltitude: 4000,
                    openingAltitude: 1000,
                    freefallTime: 50,
                    location: "New DZ",
                    aircraft: "New Plane",
                    gear: "A;;B; C",
                    jumpTypes: "Type;;One; Type Two",
                    description: "Semicolon names",
                }),
            ].join("\n") + "\n",
        ),
    });
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 1 jump")).toBeVisible();

    await page
        .getByRole("link", { name: /csv-semicolon-skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: /#10/ }).click();
    await expect(jumpItemSummary(page, "Gear used")).toContainText("A;B");
    await expect(jumpItemSummary(page, "Gear used")).toContainText("C");
    await expect(jumpItemSummary(page, "Jump types")).toContainText("Type;One");
    await expect(jumpItemSummary(page, "Jump types")).toContainText("Type Two");
    await expect(page.locator('input[name="exitAltitude"]')).toHaveValue(
        "4000",
    );
});

test("the logbook can be exported with curl and HTTP Basic auth", async ({
    page,
    request,
}) => {
    await registerUser(page, "curl-skydiver");
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles(fixturePath);
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 2 jumps")).toBeVisible();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await expect(
        page.getByText(/opens in Excel, LibreOffice, Google Docs/i),
    ).toBeVisible();
    await page.getByText("Download with curl").click();
    await expect(
        page.locator("code", {
            hasText:
                "curl -OJ -u curl-skydiver:<password> 'http://127.0.0.1:8788/logbook/export'",
        }),
    ).toBeVisible();

    const csvResponse = await request.get("/logbook/export", {
        headers: {
            Authorization: basicAuthHeader("curl-skydiver", "parachute"),
        },
    });
    expect(csvResponse.status()).toBe(200);
    expect(csvResponse.headers()["content-type"]).toContain("text/csv");
    expect(csvResponse.headers()["content-disposition"]).toMatch(
        /^attachment; filename="loki-curl-skydiver-\d{4}-\d{2}-\d{2}T\d{6}Z\.csv"$/,
    );
    const csvBody = await csvResponse.text();
    expect(csvBody).toContain(CSV_HEADER);
    expect(csvBody).toContain("jump,");
    expect(csvBody).toContain(",301,");
    expect(csvBody).toContain(",302,");
    expect(csvBody).toContain("Navigator 260");
    expect(csvBody).not.toMatch(/uuid/i);
});

test("a logbook can be imported with the JSON API", async ({
    page,
    request,
}) => {
    await registerUser(page, "json-import-skydiver");
    const csv = await readFile(fixturePath, "utf8");
    const response = await request.post("/logbook/transfer", {
        headers: {
            Authorization: basicAuthHeader("json-import-skydiver", "parachute"),
        },
        data: { csv, reset: true },
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
        statistics: {
            aircraft: 1,
            gear: 1,
            jumpTypes: 1,
            locations: 1,
            jumps: 2,
        },
    });
    await page.reload();
    await expect(page.getByRole("link", { name: /#301/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /#302/ })).toBeVisible();

    const invalidResponse = await request.post("/logbook/transfer", {
        headers: {
            Authorization: basicAuthHeader("json-import-skydiver", "parachute"),
        },
        data: { csv: "not,a,valid,csv", reset: false },
    });
    expect(invalidResponse.status()).toBe(400);
    expect(await invalidResponse.json()).toEqual({
        errors: [`CSV header must be: ${CSV_HEADER}`],
    });

    const malformedResponse = await request.post("/logbook/transfer", {
        headers: {
            Authorization: basicAuthHeader("json-import-skydiver", "parachute"),
        },
        data: {
            csv: `${CSV_HEADER}\njump,,,3,,,,,,,,,"unfinished`,
            reset: false,
        },
    });
    expect(malformedResponse.status()).toBe(400);
    expect(await malformedResponse.json()).toEqual({
        errors: ["CSV line 2: Unterminated quoted field"],
    });
});

test("Basic auth works for protected routes", async ({ page, request }) => {
    await registerUser(page, "basic-skydiver");

    const response = await request.get("/logbook", {
        headers: {
            Authorization: basicAuthHeader("basic-skydiver", "parachute"),
        },
    });

    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(
        "basic-skydiver – Loki - Skydiving Logbook",
    );
});

test("protected routes redirect to login without a session or Basic auth", async ({
    request,
}) => {
    const response = await request.get("/logbook/export", {
        maxRedirects: 0,
    });

    expect(response.status()).toBe(302);
    expect(response.headers()["location"]).toBe(
        "/login?back=%2Flogbook%2Fexport",
    );
});

test("protected routes reject invalid Basic auth credentials", async ({
    request,
}) => {
    const response = await request.get("/logbook", {
        headers: { Authorization: basicAuthHeader("missing-user", "wrong") },
    });
    expect(response.status()).toBe(401);
    expect(response.headers()["www-authenticate"]).toContain('Basic realm="');
});
