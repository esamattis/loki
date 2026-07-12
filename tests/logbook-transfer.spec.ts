import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const fixturePath = path.join(import.meta.dirname, "fixtures/logbook.jsonl");
const xmlFixturePath = path.join(
    import.meta.dirname,
    "fixtures/skydiving-logbook.xml",
);

function basicAuthHeader(username: string, password: string): string {
    return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
}

async function registerUser(page: Page, username: string) {
    await page.goto("/register");
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
    await page.getByRole("link", { name: "Export logbook" }).click();
    const download = await downloadPromise;
    const exportPath = await download.path();
    if (!exportPath) {
        throw new Error("The export download has no file path");
    }
    const exportContents = await readFile(exportPath, "utf8");
    expect(exportContents).not.toMatch(/uuid/i);
    expect(exportContents).toContain('"gear":["Navigator 260"]');
    expect(exportContents).toContain(
        '"exitAltitude":4000,"openingAltitude":1000,"freefallTime":55',
    );
    await page.getByRole("button", { name: "Log out" }).click();
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
    await expect(
        page.getByRole("checkbox", { name: "Navigator 260" }),
    ).toBeChecked();
    await expect(
        page.getByRole("checkbox", { name: "Formation skydiving" }),
    ).toBeChecked();
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
        name: "replacement-logbook.jsonl",
        mimeType: "application/x-ndjson",
        buffer: Buffer.from(
            JSON.stringify({
                type: "jump",
                jumpNumber: 1,
                exitAltitude: 3000,
                openingAltitude: 800,
                freefallTime: 45,
                location: "Replacement drop zone",
                aircraft: "Replacement aircraft",
                gear: ["Replacement gear"],
                jumpTypes: ["Replacement jump type"],
            }),
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
    expect(exportContents).toContain('"jumpNumber":1');
    expect(exportContents).toContain('"name":"Replacement gear"');
    expect(exportContents).toContain('"name":"Replacement jump type"');
    expect(exportContents).toContain('"name":"Replacement drop zone"');
    expect(exportContents).toContain('"name":"Replacement aircraft"');
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
    await expect(page.getByRole("checkbox", { name: "XML Rig" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Freefly" })).toBeChecked();
});

test("an import deduplicates repeated gear and jump type references", async ({
    page,
}) => {
    await registerUser(page, "deduplicated-import-skydiver");
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles({
        name: "duplicated-references.jsonl",
        mimeType: "application/x-ndjson",
        buffer: Buffer.from(
            JSON.stringify({
                type: "jump",
                jumpNumber: 1,
                exitAltitude: 4000,
                openingAltitude: 1000,
                freefallTime: 60,
                location: "Test location",
                aircraft: "Test aircraft",
                gear: ["Test rig", "test rig"],
                jumpTypes: ["Test type", "test type"],
            }),
        ),
    });
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 1 jump")).toBeVisible();

    await page
        .getByRole("link", { name: /deduplicated-import-skydiver's logbook/ })
        .click();
    await page.getByRole("link", { name: /#1/ }).click();
    await expect(
        page.getByRole("checkbox", { name: "Test rig" }),
    ).toBeChecked();
    await expect(
        page.getByRole("checkbox", { name: "Test type" }),
    ).toBeChecked();
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

    await page.getByRole("button", { name: "Manage logbook" }).click();
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.getByText("Download with curl").click();
    const curlCommand = page.locator("code", { hasText: "curl -OJ" });
    await expect(curlCommand).toContainText(
        `curl -OJ -u USERNAME:password http://127.0.0.1:8788/logbook/export`,
    );

    const response = await request.get("/logbook/export", {
        headers: {
            Authorization: basicAuthHeader("curl-skydiver", "parachute"),
        },
    });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain(
        "application/x-ndjson",
    );
    expect(response.headers()["content-disposition"]).toContain(
        'filename="jump-logbook.jsonl"',
    );
    const body = await response.text();
    expect(body).toContain('"jumpNumber":301');
    expect(body).toContain('"jumpNumber":302');
    expect(body).toContain('"gear":["Navigator 260"]');
    expect(body).not.toMatch(/uuid/i);
});

test("Basic auth works for protected routes", async ({ page, request }) => {
    await registerUser(page, "basic-skydiver");

    const response = await request.get("/logbook", {
        headers: {
            Authorization: basicAuthHeader("basic-skydiver", "parachute"),
        },
    });

    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("basic-skydiver – Jump Logbook");
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
