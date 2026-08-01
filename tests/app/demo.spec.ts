import { acceptPrivacyPolicyIfRequired } from "./helpers";
import { expect, test, type PlaywrightDatabase } from "./fixtures";
import { logOut, openMainMenu } from "./helpers";
import { updatePlaywrightUserOptions } from "../core/helpers";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { jumps, sessions, users } from "@/app/schema";

async function tryDemo(page: import("./fixtures").Page) {
    await page.goto("/");
    await page.getByRole("button", { name: "Try demo" }).first().click();
    await expect(page).toHaveURL("/logbook");
}

async function setOtherUsersReadonly(
    db: PlaywrightDatabase,
    readonly: boolean,
): Promise<void> {
    const storedUsers = await db
        .select({ uuid: users.uuid, options: users.options })
        .from(users)
        .where(ne(users.username, "demo"));
    await Promise.all(
        storedUsers.map((user) =>
            db
                .update(users)
                .set({
                    options: JSON.stringify({
                        ...JSON.parse(user.options),
                        readonly,
                    }),
                })
                .where(eq(users.uuid, user.uuid)),
        ),
    );
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
    db,
}) => {
    await tryDemo(page);
    await expect(
        page.getByRole("heading", { name: "622 Jumps" }),
    ).toBeVisible();
    await logOut(page);

    // Mutate demo data while the stored CSV checksum still matches.
    // Bump the HTML cache generation so the UI reflects the DB change.
    const [demoUser] = await db
        .select({ uuid: users.uuid })
        .from(users)
        .where(eq(users.username, "demo"));
    if (!demoUser) throw new Error("Expected demo user");
    await db
        .update(jumps)
        .set({ description: "checksum-skip-marker" })
        .where(
            and(eq(jumps.jumpNumber, 622), eq(jumps.userUuid, demoUser.uuid)),
        );
    await db
        .update(users)
        .set({
            htmlCacheGeneration: sql`${users.htmlCacheGeneration} + 1`,
        })
        .where(eq(users.uuid, demoUser.uuid));

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

test("try demo creates a non-admin read-only user", async ({ page, db }) => {
    await tryDemo(page);

    const rows = await db
        .select({ admin: users.admin, options: users.options })
        .from(users)
        .where(eq(users.username, "demo"));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.admin).toBe(false);
    expect(JSON.parse(rows[0]?.options ?? "{}").readonly).toBe(true);
});

test("first account is admin when only readonly users exist", async ({
    page,
    db,
}) => {
    await tryDemo(page);
    await logOut(page);

    // Treat every existing account as readonly so registration looks empty,
    // without deleting the shared bootstrap admin used by later tests.
    await setOtherUsersReadonly(db, true);

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

        const rows = await db
            .select({ username: users.username, admin: users.admin })
            .from(users)
            .where(inArray(users.username, ["demo", "post-demo-admin"]))
            .orderBy(users.username);
        expect(rows).toEqual([
            { username: "demo", admin: false },
            { username: "post-demo-admin", admin: true },
        ]);
    } finally {
        const [postDemoAdmin] = await db
            .select({ uuid: users.uuid })
            .from(users)
            .where(eq(users.username, "post-demo-admin"));
        if (postDemoAdmin) {
            await db
                .delete(sessions)
                .where(eq(sessions.userUuid, postDemoAdmin.uuid));
            await db.delete(users).where(eq(users.uuid, postDemoAdmin.uuid));
        }
        await setOtherUsersReadonly(db, false);
    }
});

test("try demo re-imports when example data checksum changes", async ({
    page,
    db,
}) => {
    await tryDemo(page);
    await expect(
        page.getByRole("heading", { name: "622 Jumps" }),
    ).toBeVisible();
    await logOut(page);

    const [demoUser] = await db
        .select({ uuid: users.uuid })
        .from(users)
        .where(eq(users.username, "demo"));
    if (!demoUser) throw new Error("Expected demo user");
    await db
        .update(jumps)
        .set({ description: "should-be-replaced-on-reimport" })
        .where(
            and(eq(jumps.jumpNumber, 622), eq(jumps.userUuid, demoUser.uuid)),
        );
    await updatePlaywrightUserOptions(db, {
        username: "demo",
        updates: { exampleDataChecksum: "stale-checksum" },
    });

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
