import { expect, test } from "@playwright/test";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { logOut } from "../tests/helpers";

const sqlitePath = resolve(".playwright/executable/sqlite/loki.sqlite");

test("serves the app with an initialized SQLite database", async ({
    page,
    request,
}) => {
    const homeResponse = await request.get("/", { maxRedirects: 0 });
    expect(homeResponse.status()).toBe(302);
    expect(homeResponse.headers().location).toBe("/login");

    const loginResponse = await request.get("/login", { maxRedirects: 0 });
    expect(loginResponse.status()).toBe(302);
    expect(loginResponse.headers().location).toBe("/register");

    await page.goto("/register");
    await expect(
        page.getByRole("heading", { name: "Create account" }),
    ).toBeVisible();
    await expect(page.locator('input[name="invitationCode"]')).toHaveCount(0);

    const formShell = page
        .getByRole("heading", {
            name: "Create account",
        })
        .locator("..");
    await expect(formShell).toHaveCSS("border-radius", "16px");
    await expect(formShell).toHaveCSS("background-color", "rgb(255, 255, 255)");

    const password = page.locator('input[name="password"]');
    await expect(password).toHaveAttribute("type", "password");
    await page
        .getByRole("button", { name: "Show/hide password" })
        .first()
        .click();
    await expect(password).toHaveAttribute("type", "text");

    await page.locator('input[name="username"]').fill("executable-user");
    await page.locator('input[name="displayName"]').fill("Executable User");
    await page
        .locator('input[name="email"]')
        .fill("executable-user@example.test");
    await password.fill("executable-password");
    await page
        .locator('input[name="confirmPassword"]')
        .fill("executable-password");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/logbook");
    await expect(
        page.getByRole("link", { name: "Footer terms & privacy policy" }),
    ).toHaveCount(0);
    await page.goto("/privacy");
    await expect(
        page.getByRole("button", { name: "Accept terms & privacy policy" }),
    ).toHaveCount(0);
    await expect(page.getByText(`SQLite database: ${sqlitePath}`)).toHaveCount(
        0,
    );

    await page.goto("/about");
    await expect(
        page.getByText(`SQLite database: ${sqlitePath}`),
    ).toBeVisible();
    await page.goto("/logbook");

    await logOut(page);
    await expect(page).toHaveURL("/login");
    await page.locator('input[name="usernameOrEmail"]').fill("executable-user");
    await page.locator('input[name="password"]').fill("executable-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/logbook");

    await page.goto("/preferences");
    await expect(
        page.getByRole("heading", { name: "Performance" }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Enable page caching")).toHaveCount(0);

    const manifestResponse = await request.get("/manifest.json");
    expect(manifestResponse.status()).toBe(200);
    await expect(manifestResponse.json()).resolves.toMatchObject({
        name: "Loki - Skydiving Logbook",
    });

    expect(existsSync(sqlitePath)).toBe(true);
    const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });
    try {
        const appliedMigration = sqlite
            .prepare("SELECT COUNT(*) AS count FROM __drizzle_migrations")
            .get();
        const migrations = readMigrationFiles({
            migrationsFolder: resolve("drizzle"),
        });
        expect(appliedMigration?.count).toBe(migrations.length);
        const usersTable = sqlite
            .prepare(
                "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'users'",
            )
            .get();
        expect(usersTable?.count).toBe(1);
    } finally {
        sqlite.close();
    }
});
