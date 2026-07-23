import { expect, test, type Page } from "./fixtures";
import { executePlaywrightDb, openMainMenu } from "./helpers";

async function registerUser(page: Page, username: string, displayName: string) {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="displayName"]').fill(displayName);
    await page.locator('input[name="email"]').fill(`${username}@example.test`);
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/logbook");
}

test("page caching invalidates on POST and can be disabled", async ({
    page,
}) => {
    const username = "html-cache-skydiver";
    const initialName = "Cached Skydiver";
    await registerUser(page, username, initialName);

    const cachedResponse = await page.request.get("/logbook");
    expect(cachedResponse.headers()["cache-control"]).toBe("private, no-store");
    expect(cachedResponse.headers()["x-loki-html-cache"]).toBe("HIT");
    expect(cachedResponse.headers()["server-timing"]).toMatch(
        /^sql;dur=\d+\.\d{2}, sql-longest;dur=\d+\.\d{2}, page;dur=\d+\.\d{2}$/,
    );
    expect(cachedResponse.headers()["x-loki-sql-queries"]).toMatch(
        /^[1-9]\d*$/,
    );
    expect(await cachedResponse.text()).toContain(initialName);

    const updatedName = "Invalidated Skydiver";
    await executePlaywrightDb(`
        UPDATE users SET display_name = '${updatedName}'
        WHERE username = '${username}';
    `);
    const staleResponse = await page.request.get("/logbook");
    expect(await staleResponse.text()).toContain(initialName);

    const invalidPost = await page.request.post("/logbook/locations/new", {
        form: { name: "" },
    });
    expect(invalidPost.status()).toBe(200);
    const freshResponse = await page.request.get("/logbook");
    expect(freshResponse.headers()["x-loki-html-cache"]).toBe("MISS");
    expect(freshResponse.headers()["x-loki-sql-queries"]).toMatch(/^[1-9]\d*$/);
    expect(await freshResponse.text()).toContain(updatedName);

    await page.goto("/preferences");
    const preferencesResponse = await page.request.get("/preferences");
    expect(preferencesResponse.headers()["x-loki-html-cache"]).toBe("BYPASS");
    const cacheCheckbox = page.getByLabel("Enable page caching");
    await expect(cacheCheckbox).toBeChecked();
    await cacheCheckbox.uncheck();
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page).toHaveURL("/logbook");

    const disabledName = "Uncached Skydiver";
    await executePlaywrightDb(`
        UPDATE users SET display_name = '${disabledName}'
        WHERE username = '${username}';
    `);
    const uncachedResponse = await page.request.get("/logbook");
    expect(uncachedResponse.headers()["x-loki-html-cache"]).toBe("DISABLED");
    expect(await uncachedResponse.text()).toContain(disabledName);

    await openMainMenu(page);
    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await expect(page.getByLabel("Enable page caching")).not.toBeChecked();
});

test("page caching is isolated by user", async ({ browser, page }) => {
    const firstName = "First Cached Skydiver";
    await registerUser(page, "first-cached-skydiver", firstName);
    const firstResponse = await page.request.get("/logbook");
    expect(await firstResponse.text()).toContain(firstName);

    const secondContext = await browser.newContext();
    try {
        const secondPage = await secondContext.newPage();
        const secondName = "Second Cached Skydiver";
        await registerUser(secondPage, "second-cached-skydiver", secondName);
        const secondResponse = await secondPage.request.get("/logbook");
        const secondHtml = await secondResponse.text();
        expect(secondHtml).toContain(secondName);
        expect(secondHtml).not.toContain(firstName);
    } finally {
        await secondContext.close();
    }
});
