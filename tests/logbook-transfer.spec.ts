import { expect, test, type Page } from "./fixtures";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { jumpItemSummary, logOut, openManageLogbook } from "./helpers";

const fixturePath = path.join(import.meta.dirname, "fixtures/logbook.csv");
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
    exitAltitude: number;
    openingAltitude: number;
    freefallTime: number;
    location: string;
    aircraft: string;
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
        options.exitAltitude,
        options.openingAltitude,
        options.freefallTime,
        options.location,
        options.aircraft,
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
    await expect(page).toHaveURL("/logbook");
}

test("statistics show recorded and total jump counts for every item", async ({
    page,
}) => {
    await registerUser(page, "statistics-skydiver");
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles(fixturePath);
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 2 jumps")).toBeVisible();

    await page
        .getByRole("link", { name: /statistics-skydiver's logbook/ })
        .click();
    await openManageLogbook(page);
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
    await expect(page.getByText("1 min 43 s", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "View detailed statistics" }).click();

    await expect(page).toHaveURL("/logbook/statistics/detailed");
    await expect(
        page.getByRole("heading", { name: "Detailed statistics" }),
    ).toBeVisible();
    await expect(
        page.getByText("Total freefall time").locator(".."),
    ).toContainText("1 min 43 s");
    await expect(
        page.getByText("Total freefall distance").locator(".."),
    ).toContainText("6 km");
    await expect(
        page.getByText("Longest freefall distance").locator(".."),
    ).toContainText("3 km");
    await expect(
        page.getByRole("row").filter({ hasText: "Skydive Example" }),
    ).toContainText("2");
    await expect(
        page.getByRole("row").filter({ hasText: "Skydive Example" }),
    ).toContainText("302");
    await expect(
        page.getByRole("row").filter({ hasText: "Twin Otter" }),
    ).toContainText("122");
    await expect(
        page.getByRole("row").filter({ hasText: "Navigator 260" }),
    ).toContainText("44");
    await expect(
        page.getByRole("row").filter({ hasText: "Formation skydiving" }),
    ).toContainText("20");
});

test("a logbook can be imported, edited, exported, and imported by another user", async ({
    page,
}) => {
    await registerUser(page, "first-skydiver");

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page.getByRole("link", { name: "Add gear" }).click();
    await page.locator('input[name="name"]').fill("Navigator 260");
    await page.locator('input[name="previousCount"]').fill("1");
    await page.getByRole("button", { name: "Add gear" }).click();

    await page.getByRole("link", { name: /first-skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles(fixturePath);
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 2 jumps")).toBeVisible();

    await page.getByRole("link", { name: /first-skydiver's logbook/ }).click();
    await expect(page.getByRole("link", { name: /#301/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /#302/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /#\d+/ })).toHaveCount(2);
    await page.getByRole("link", { name: /#301/ }).click();
    await page
        .locator('textarea[name="description"]')
        .fill("Edited after import");
    await page.getByRole("button", { name: "Save jump" }).click();
    await expect(page.getByText("Edited after import")).toBeVisible();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles(fixturePath);
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 2 jumps")).toBeVisible();
    await page.getByRole("link", { name: /first-skydiver's logbook/ }).click();
    await expect(page.getByRole("link", { name: /#\d+/ })).toHaveCount(2);
    await page.getByRole("link", { name: /#301/ }).click();
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "Imported training jump",
    );
    await page
        .locator('textarea[name="description"]')
        .fill("Edited after import");
    await page.getByRole("button", { name: "Save jump" }).click();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export logbook" }).click();
    const download = await downloadPromise;
    const exportPath = await download.path();
    if (!exportPath) {
        throw new Error("The export download has no file path");
    }
    const exportContents = await readFile(exportPath, "utf8");
    expect(exportContents).not.toMatch(/uuid/i);
    expect(exportContents).toContain(CSV_HEADER);
    expect(exportContents).toContain("Navigator 260");
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
        "Skydive Example / Twin Otter",
    );
    await expect(page.getByRole("link", { name: /#302/ })).toContainText(
        "Skydive Example / Twin Otter",
    );
    await expect(page.getByRole("link", { name: /#\d+/ })).toHaveCount(2);
    await page.getByRole("link", { name: /#301/ }).click();
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "Edited after import",
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
    await expect(jumpItemSummary(page, "Jump types")).toContainText(
        "Formation skydiving",
    );
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
    await page.getByRole("button", { name: "Export logbook" }).click();
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
    await expect(importedJump).toContainText("Skydive XML / Caravan");
    await expect(importedJump).toContainText("2024-06-15");
    await importedJump.click();
    await expect(page.locator('input[name="jumpDate"]')).toHaveValue(
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
