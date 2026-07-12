import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const fixturePath = path.join(import.meta.dirname, "fixtures/logbook.jsonl");

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

test("a logbook can be imported, edited, exported, and imported by another user", async ({
    page,
}) => {
    await registerUser(page, "first-skydiver");

    await page.getByRole("link", { name: "Manage gear" }).click();
    await page.getByRole("link", { name: "Add gear" }).click();
    await page.locator('input[name="name"]').fill("Navigator 260");
    await page.locator('input[name="previousCount"]').fill("1");
    await page.getByRole("button", { name: "Add gear" }).click();

    await page.getByRole("link", { name: /first-skydiver's logbook/ }).click();
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles(fixturePath);
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 2 jumps")).toBeVisible();

    await page.getByRole("link", { name: /first-skydiver's logbook/ }).click();
    await expect(page.getByRole("link", { name: /Jump #301/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Jump #302/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Jump #\d+/ })).toHaveCount(2);
    await page.getByRole("link", { name: /Jump #301/ }).click();
    await page
        .locator('textarea[name="description"]')
        .fill("Edited after import");
    await page.getByRole("button", { name: "Save jump" }).click();
    await expect(page.getByText("Edited after import")).toBeVisible();

    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles(fixturePath);
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 2 jumps")).toBeVisible();
    await page.getByRole("link", { name: /first-skydiver's logbook/ }).click();
    await expect(page.getByRole("link", { name: /Jump #\d+/ })).toHaveCount(2);
    await page.getByRole("link", { name: /Jump #301/ }).click();
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "Imported training jump",
    );
    await page
        .locator('textarea[name="description"]')
        .fill("Edited after import");
    await page.getByRole("button", { name: "Save jump" }).click();

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

    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles(exportPath);
    await page.getByRole("button", { name: "Import logbook" }).click();
    await expect(page.getByText("Imported 2 jumps")).toBeVisible();

    await page.getByRole("link", { name: /second-skydiver's logbook/ }).click();
    await expect(page.getByRole("link", { name: /Jump #301/ })).toContainText(
        "Skydive Example / Twin Otter",
    );
    await expect(page.getByRole("link", { name: /Jump #302/ })).toContainText(
        "Skydive Example / Twin Otter",
    );
    await expect(page.getByRole("link", { name: /Jump #\d+/ })).toHaveCount(2);
    await page.getByRole("link", { name: /Jump #301/ }).click();
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
