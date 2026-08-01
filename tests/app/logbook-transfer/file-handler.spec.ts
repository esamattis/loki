import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "../fixtures";
import { acceptPrivacyPolicyIfRequired, openManageLogbook } from "../helpers";

const fixturePath = path.join(import.meta.dirname, "../fixtures/logbook.csv");

async function registerUser(page: Page) {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("associated-file-user");
    await page
        .locator('input[name="displayName"]')
        .fill("Associated File User");
    await page
        .locator('input[name="email"]')
        .fill("associated-file-user@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await acceptPrivacyPolicyIfRequired(page);
    await expect(page).toHaveURL("/logbook");
}

test("manifest associates CSV files with the logbook transfer page", async ({
    request,
}) => {
    const response = await request.get("/manifest.json");
    expect(response.status()).toBe(200);
    const manifest = await response.json();
    expect(manifest.file_handlers).toEqual([
        {
            action: "/logbook/transfer",
            accept: {
                "text/csv": [".csv"],
            },
        },
    ]);
});

test("opening an associated CSV file selects it without importing", async ({
    page,
}) => {
    await page.addInitScript(() => {
        const launchQueue = {
            setConsumer(consumer: unknown) {
                Reflect.set(window, "__lokiFileLaunchConsumer", consumer);
            },
        };
        Object.defineProperty(window, "launchQueue", {
            configurable: true,
            value: launchQueue,
        });
    });
    await registerUser(page);
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await expect(page).toHaveURL("/logbook/transfer");

    const csv = await readFile(fixturePath);
    await page.evaluate(async (bytes) => {
        const consumer = Reflect.get(window, "__lokiFileLaunchConsumer");
        if (typeof consumer !== "function") {
            throw new Error("File launch consumer was not registered");
        }
        const file = new File([new Uint8Array(bytes)], "opened-logbook.csv", {
            type: "text/csv",
        });
        await Reflect.apply(consumer, undefined, [
            {
                files: [
                    {
                        async getFile() {
                            return file;
                        },
                    },
                ],
            },
        ]);
    }, Array.from(csv));

    await expect(page.locator('input[name="file"]')).toHaveValue(
        /opened-logbook\.csv$/,
    );
    await expect(
        page.getByRole("button", { name: "Import logbook" }),
    ).toHaveClass(/bg-indigo-600/);
    await expect(page.getByText("Imported 2 jumps")).toHaveCount(0);
});
