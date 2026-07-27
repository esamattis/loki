import { acceptPrivacyPolicyIfRequired } from "./helpers";
import { expect, test } from "./fixtures";
import {
    executePlaywrightDb,
    logOut,
    openMainMenu,
    queryPlaywrightDb,
} from "./helpers";

async function tryDemo(page: import("./fixtures").Page) {
    await page.goto("/");
    await page.getByRole("button", { name: "Try demo" }).first().click();
    await expect(page).toHaveURL("/logbook");
}

test("try demo logs in with example data and blocks writes", async ({
    page,
}) => {
    await tryDemo(page);
    await expect(
        page.getByRole("heading", { name: "622 Jumps" }),
    ).toBeVisible();
    await expect(
        page.getByRole("link", {
            name: /#622\b.*Wingsuit.*Skydive Chicago.*Twin Otter/,
        }),
    ).toBeVisible();

    await page
        .getByRole("link", {
            name: /#622\b.*Wingsuit.*Skydive Chicago.*Twin Otter/,
        })
        .click();
    await expect(page).toHaveURL(/\/logbook\/jumps\/[^/]+$/);
    await page.getByRole("button", { name: "Save jump" }).click();
    await expect(page).toHaveURL("/readonly");
    await expect(
        page.getByRole("heading", { name: "Read-only account" }),
    ).toBeVisible();
    await expect(
        page.getByText("This account is read-only", { exact: false }),
    ).toBeVisible();
    await expect(
        page.getByRole("link", { name: "Create account" }),
    ).toHaveCount(0);
    await expect(
        page.getByRole("link", { name: "Back to logbook" }),
    ).toHaveCount(0);

    await page.locator("main").getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL("/login");
});

test("adding a jump as demo redirects to the read-only page", async ({
    page,
}) => {
    await tryDemo(page);

    await page.goto("/logbook/jumps/new");
    await page.locator('input[name="jumpNumber"]').fill("9999");
    await page.getByRole("button", { name: "Add jump" }).click();
    await expect(page).toHaveURL("/readonly");
    await expect(
        page.getByRole("heading", { name: "Read-only account" }),
    ).toBeVisible();
});

test("read-only policy allows safe methods and rejects all mutation methods", async ({
    page,
}) => {
    await tryDemo(page);

    for (const method of ["GET", "HEAD", "OPTIONS"]) {
        const response = await page.request.fetch("/logbook", {
            method,
            maxRedirects: 0,
        });
        expect(response.headers()["location"]).not.toBe("/readonly");
    }

    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
        const response = await page.request.fetch("/logbook", {
            method,
            maxRedirects: 0,
        });
        expect(response.status()).toBe(302);
        expect(response.headers()["location"]).toBe("/readonly");
    }

    const privacyResponse = await page.request.post("/privacy", {
        maxRedirects: 0,
    });
    expect(privacyResponse.headers()["location"]).not.toBe("/readonly");

    const logoutResponse = await page.request.post("/logout", {
        maxRedirects: 0,
    });
    expect(logoutResponse.status()).toBe(302);
    expect(logoutResponse.headers()["location"]).toBe("/login");
});

test("try demo skips re-import when example data checksum matches", async ({
    page,
}) => {
    await tryDemo(page);
    await expect(
        page.getByRole("heading", { name: "622 Jumps" }),
    ).toBeVisible();
    await logOut(page);

    // Mutate demo data while the stored CSV checksum still matches.
    // Bump the HTML cache generation so the UI reflects the DB change.
    await executePlaywrightDb(`
        UPDATE jumps
        SET description = 'checksum-skip-marker'
        WHERE jump_number = 622
          AND user_uuid = (SELECT uuid FROM users WHERE username = 'demo');
        UPDATE users
        SET html_cache_generation = html_cache_generation + 1
        WHERE username = 'demo';
    `);

    await tryDemo(page);
    await page
        .getByRole("link", {
            name: /#622\b.*Wingsuit.*Skydive Chicago.*Twin Otter/,
        })
        .click();
    await expect(page.getByText("checksum-skip-marker")).toBeVisible();
    await expect(
        page.getByText("Long flock at sunset. Clean flight, clean open"),
    ).toHaveCount(0);
});

test("try demo creates a non-admin read-only user", async ({ page }) => {
    await tryDemo(page);

    const rows = await queryPlaywrightDb(`
        SELECT admin, json_extract(options, '$.readonly') AS readonly
        FROM users
        WHERE username = 'demo'
    `);
    expect(rows).toEqual([{ admin: 0, readonly: 1 }]);
});

test("first account is admin when only readonly users exist", async ({
    page,
}) => {
    await tryDemo(page);
    await logOut(page);

    // Treat every existing account as readonly so registration looks empty,
    // without deleting the shared bootstrap admin used by later tests.
    await executePlaywrightDb(`
        UPDATE users
        SET options = json_set(options, '$.readonly', json('true'))
        WHERE username != 'demo';
    `);

    try {
        await page.goto("/register");
        await expect(
            page.getByRole("heading", {
                name: "First account: administrator",
            }),
        ).toBeVisible();
        await expect(page.locator('input[name="invitationCode"]')).toHaveCount(
            0,
        );

        await page.locator('input[name="username"]').fill("post-demo-admin");
        await page.locator('input[name="displayName"]').fill("Post Demo Admin");
        await page
            .locator('input[name="email"]')
            .fill("post-demo-admin@example.test");
        await page.locator('input[name="password"]').fill("parachute");
        await page.locator('input[name="confirmPassword"]').fill("parachute");
        await page.getByRole("button", { name: "Create account" }).click();
        await acceptPrivacyPolicyIfRequired(page);
        await expect(page).toHaveURL("/logbook");

        await openMainMenu(page);
        await expect(
            page.getByRole("link", { name: "Admin", exact: true }),
        ).toBeVisible();

        const rows = await queryPlaywrightDb(`
            SELECT username, admin
            FROM users
            WHERE username IN ('demo', 'post-demo-admin')
            ORDER BY username
        `);
        expect(rows).toEqual([
            { username: "demo", admin: 0 },
            { username: "post-demo-admin", admin: 1 },
        ]);
    } finally {
        await executePlaywrightDb(`
            DELETE FROM sessions
            WHERE user_uuid = (
                SELECT uuid FROM users WHERE username = 'post-demo-admin'
            );
            DELETE FROM users WHERE username = 'post-demo-admin';
            UPDATE users
            SET options = json_set(options, '$.readonly', json('false'))
            WHERE username != 'demo';
        `);
    }
});

test("try demo re-imports when example data checksum changes", async ({
    page,
}) => {
    await tryDemo(page);
    await expect(
        page.getByRole("heading", { name: "622 Jumps" }),
    ).toBeVisible();
    await logOut(page);

    await executePlaywrightDb(`
        UPDATE jumps
        SET description = 'should-be-replaced-on-reimport'
        WHERE jump_number = 622
          AND user_uuid = (SELECT uuid FROM users WHERE username = 'demo');
        UPDATE users
        SET options = json_set(options, '$.exampleDataChecksum', 'stale-checksum')
        WHERE username = 'demo';
    `);

    await tryDemo(page);
    await page
        .getByRole("link", {
            name: /#622\b.*Wingsuit.*Skydive Chicago.*Twin Otter/,
        })
        .click();
    await expect(
        page.getByText("Long flock at sunset. Clean flight, clean open"),
    ).toBeVisible();
    await expect(page.getByText("should-be-replaced-on-reimport")).toHaveCount(
        0,
    );
});
