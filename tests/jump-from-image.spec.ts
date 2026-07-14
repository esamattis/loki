import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openMainMenu, openManageLogbook } from "./helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// eslint-disable-next-line max-lines-per-function
test("a skydiver can create a jump from an image", async ({ page }) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("image-skydiver");
    await page.locator('input[name="displayName"]').fill("Image Skydiver");
    await page.locator('input[name="email"]').fill("image@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page.getByRole("link", { name: "Add location" }).click();
    await page.locator('input[name="name"]').fill("Image Drop Zone");
    await page.getByRole("button", { name: "Add location" }).click();

    await page.getByRole("link", { name: /Image Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page.getByRole("link", { name: "Add aircraft" }).click();
    await page.locator('input[name="name"]').fill("Image Plane");
    await page.getByRole("button", { name: "Add aircraft" }).click();

    await page.getByRole("link", { name: /Image Skydiver's logbook/ }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage gear" }).click();
    await page.getByRole("link", { name: "Add gear" }).click();
    await page.locator('input[name="name"]').fill("Image Canopy");
    await page.getByRole("button", { name: "Add gear" }).click();

    await page.getByRole("link", { name: /Image Skydiver's logbook/ }).click();
    await openMainMenu(page);
    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await page.locator('input[name="openaiApiKey"]').fill("sk-test-key");
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page).toHaveURL("/logbook");

    await page.getByRole("link", { name: "From image", exact: true }).click();
    await expect(page).toHaveURL("/logbook/jumps/new/from-image");
    await expect(
        page.locator('textarea[name="additionalContext"]'),
    ).toHaveValue("");
    await expect(page.locator('select[name="model"]')).toHaveValue(
        "gpt-5.6-luna",
    );
    await expect(
        page
            .getByRole("main")
            .getByRole("link", { name: "Preferences" })
            .first(),
    ).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Take photo" }),
    ).toBeVisible();
    await expect(page.locator('input[capture="environment"]')).toHaveCount(1);
    await page
        .locator('input[name="image"]')
        .setInputFiles(path.join(__dirname, "fixtures/jump-image.png"));
    await page.getByRole("button", { name: "Read image" }).click();

    await expect(page).toHaveURL(/\/logbook\/jumps\/new\?/);
    await expect(page.locator('input[name="jumpDate"]')).toHaveValue(
        "2024-06-15",
    );
    await expect(page.locator('input[name="jumpNumber"]')).toHaveValue("42");
    await expect(page.locator('input[name="exitAltitude"]')).toHaveValue(
        "4000",
    );
    await expect(page.locator('input[name="openingAltitude"]')).toHaveValue(
        "1200",
    );
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("50");
    await expect(
        page.locator('select[name="locationUuid"] option:checked'),
    ).toHaveText("Image Drop Zone");
    await expect(
        page.locator('select[name="aircraftUuid"] option:checked'),
    ).toHaveText("Image Plane");
    await expect(page.locator('input[name="locationName"]')).toHaveValue(
        "Image Drop Zone",
    );
    await expect(page.locator('input[name="aircraftName"]')).toHaveValue(
        "Image Plane",
    );
    await expect(page.locator('input[name="gearName"]')).toHaveValue(
        "Image Canopy",
    );
    await expect(page.locator('input[name="jumpTypeName"]')).toHaveValue("FS");
    await expect(
        page.locator("label", { hasText: "Image Canopy" }).locator("input"),
    ).toBeChecked();
    await expect(
        page.locator("label", { hasText: /^FS$/ }).locator("input"),
    ).toBeChecked();
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "From image mock",
    );

    await page.getByRole("button", { name: "Add jump" }).click();
    await expect(page).toHaveURL("/logbook");
    await expect(page.getByRole("link", { name: /#42 / })).toBeVisible();
    await page.getByRole("link", { name: /#42 / }).click();

    await expect(page.locator('input[name="jumpDate"]')).toHaveValue(
        "2024-06-15",
    );
    await expect(page.locator('input[name="jumpNumber"]')).toHaveValue("42");
    await expect(page.locator('input[name="exitAltitude"]')).toHaveValue(
        "4000",
    );
    await expect(page.locator('input[name="openingAltitude"]')).toHaveValue(
        "1200",
    );
    await expect(page.locator('input[name="freefallTime"]')).toHaveValue("50");
    await expect(
        page.locator('select[name="locationUuid"] option:checked'),
    ).toHaveText("Image Drop Zone");
    await expect(
        page.locator('select[name="aircraftUuid"] option:checked'),
    ).toHaveText("Image Plane");
    await expect(
        page.locator("label", { hasText: "Image Canopy" }).locator("input"),
    ).toBeChecked();
    await expect(
        page.locator("label", { hasText: /^FS$/ }).locator("input"),
    ).toBeChecked();
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "From image mock",
    );

    await page.getByRole("link", { name: "From image", exact: true }).click();
    await expect(page).toHaveURL("/logbook/jumps/new/from-image");
    const usageSection = page
        .locator("section")
        .filter({ has: page.getByRole("heading", { name: "AI usage" }) });
    await expect(
        usageSection.getByRole("heading", { name: "AI usage" }),
    ).toBeVisible();
    const usageRow = usageSection
        .locator("table tbody tr")
        .filter({ hasText: "#42 · 2024-06-15 · Image Drop Zone · FS" });
    await expect(usageRow).toHaveCount(1);
    await expect(
        usageRow.getByRole("cell", { name: "GPT-5.6 Luna" }),
    ).toBeVisible();
    await expect(usageRow.getByRole("cell", { name: "1,200" })).toBeVisible();
    await expect(usageRow.getByRole("cell", { name: "180" })).toBeVisible();
    await expect(usageRow.getByRole("cell", { name: "1,380" })).toBeVisible();
    await expect(
        usageSection
            .locator("p")
            .filter({ hasText: "Input tokens" })
            .locator("..")
            .getByText("1,200"),
    ).toBeVisible();
});

test("from image form persists model and additional context after reload", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("persist-image-skydiver");
    await page
        .locator('input[name="displayName"]')
        .fill("Persist Image Skydiver");
    await page
        .locator('input[name="email"]')
        .fill("persist-image@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await page.getByRole("link", { name: "From image", exact: true }).click();
    await expect(page).toHaveURL("/logbook/jumps/new/from-image");

    await page.locator('select[name="model"]').selectOption("gpt-4o-mini");
    await page
        .locator('textarea[name="additionalContext"]')
        .fill("Remember this context across reload");

    await page.reload();

    await expect(page.locator('select[name="model"]')).toHaveValue(
        "gpt-4o-mini",
    );
    await expect(
        page.locator('textarea[name="additionalContext"]'),
    ).toHaveValue("Remember this context across reload");
});

// eslint-disable-next-line max-lines-per-function
test("a skydiver can paste a jump image from the clipboard", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("paste-skydiver");
    await page.locator('input[name="displayName"]').fill("Paste Skydiver");
    await page.locator('input[name="email"]').fill("paste@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await openMainMenu(page);
    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await page.locator('input[name="openaiApiKey"]').fill("sk-test-key");
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page).toHaveURL("/logbook");

    await page.getByRole("link", { name: "From image", exact: true }).click();
    await expect(page).toHaveURL("/logbook/jumps/new/from-image");
    await expect(
        page.getByRole("button", { name: "Paste from clipboard" }),
    ).toBeVisible();

    const imageBase64 = fs
        .readFileSync(path.join(__dirname, "fixtures/jump-image.png"))
        .toString("base64");
    await page.evaluate((base64) => {
        const byteString = atob(base64);
        const bytes = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
            bytes[i] = byteString.charCodeAt(i);
        }
        const file = new File([bytes], "jump-image.png", {
            type: "image/png",
        });
        const dt = new DataTransfer();
        dt.items.add(file);
        window.dispatchEvent(
            new ClipboardEvent("paste", {
                clipboardData: dt,
                bubbles: true,
                cancelable: true,
            }),
        );
    }, imageBase64);

    await expect(
        page.getByRole("img", { name: "Selected jump image preview" }),
    ).toBeVisible();
    await expect(page.getByText(/pasted-image\.png/)).toBeVisible();

    await page.getByRole("button", { name: "Read image" }).click();

    await expect(page).toHaveURL(/\/logbook\/jumps\/new\?/);
    await expect(page.locator('input[name="jumpDate"]')).toHaveValue(
        "2024-06-15",
    );
    await expect(page.locator('input[name="jumpNumber"]')).toHaveValue("42");
});

// eslint-disable-next-line max-lines-per-function
test("installed service worker restores a shared image into the from-image reader", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("share-skydiver");
    await page.locator('input[name="displayName"]').fill("Share Skydiver");
    await page.locator('input[name="email"]').fill("share@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/logbook");

    // Reload so the already-registered service worker controls the page.
    await page.reload();
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
    });
    const hasController = await page.evaluate(
        () => !!navigator.serviceWorker.controller,
    );
    expect(hasController).toBe(true);

    const imageBase64 = fs
        .readFileSync(path.join(__dirname, "fixtures/jump-image.png"))
        .toString("base64");
    const shareResponse = await page.evaluate(async (base64) => {
        const byteString = atob(base64);
        const bytes = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
            bytes[i] = byteString.charCodeAt(i);
        }
        const file = new File([bytes], "shared-image.png", {
            type: "image/png",
        });
        const formData = new FormData();
        formData.append("image", file);
        const response = await fetch("/logbook/jumps/new/from-image/share", {
            method: "POST",
            body: formData,
            redirect: "follow",
        });
        return { status: response.status, url: response.url };
    }, imageBase64);
    expect(shareResponse.status).toBe(200);
    expect(shareResponse.url).toContain("/logbook/jumps/new/from-image");

    // The worker wrote the draft into IndexedDB; navigating to the reader
    // restores and previews the shared file via the existing init path.
    await page.goto("/logbook/jumps/new/from-image");
    await expect(
        page.getByRole("img", { name: "Selected jump image preview" }),
    ).toBeVisible();
    await expect(page.getByText(/shared-image\.png/)).toBeVisible();
});

test("manifest declares the image share target metadata", async ({
    request,
}) => {
    const response = await request.get("/manifest.json");
    expect(response.status()).toBe(200);
    const manifest = await response.json();
    expect(manifest.share_target).toEqual({
        action: "/logbook/jumps/new/from-image/share",
        method: "POST",
        enctype: "multipart/form-data",
        params: {
            files: [
                {
                    name: "image",
                    accept: [
                        "image/jpeg",
                        "image/png",
                        "image/webp",
                        "image/gif",
                    ],
                },
            ],
        },
    });
});
