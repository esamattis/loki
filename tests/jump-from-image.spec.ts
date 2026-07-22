import { expect, test } from "./fixtures";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    expectLogbookAroundJump,
    jumpItemSummary,
    openDangerZone,
    openMainMenu,
    openManageLogbook,
} from "./helpers";
// helper import patched below

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

    await page.getByRole("link", { name: "AI Vision", exact: true }).click();
    await expect(page).toHaveURL("/logbook/jumps/new/from-image");
    await expect(
        page.getByRole("heading", { name: "Read jump from image" }),
    ).toHaveCount(1);
    await expect(
        page.getByRole("heading", { name: "Read jump data from an image" }),
    ).toHaveCount(0);
    await expect(
        page.locator('textarea[name="additionalContext"]'),
    ).toHaveValue("");
    await expect(
        page.getByRole("button", { name: "Clear additional context" }),
    ).toBeHidden();
    await expect(page.locator('select[name="model"]')).toHaveValue(
        "gpt-5.6-luna",
    );
    await expect(
        page
            .getByRole("main")
            .getByRole("link", { name: "Preferences" })
            .first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Camera" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Camera" })).toHaveAttribute(
        "data-loki-tooltip",
        "Take a photo with your camera",
    );
    await expect(page.locator('input[capture="environment"]')).toHaveCount(1);
    await page
        .locator("input[multiple]")
        .setInputFiles(path.join(__dirname, "fixtures/jump-image.png"));
    await page.getByRole("button", { name: "Read image" }).click();

    await expect(page).toHaveURL(/\/logbook\/jumps\/new\?/);
    await expect(page).toHaveURL(/[?&]imageId=[^&]+/);
    await expect(
        page.getByRole("heading", { name: "Values read from this image" }),
    ).toBeVisible();
    await expect(
        page.getByRole("img", { name: "Image used to read jump values" }),
    ).toBeVisible();
    await expect(
        page.getByRole("link", { name: "Back to image reading" }),
    ).toHaveAttribute("href", "/logbook/jumps/new/from-image");
    await expect(page.locator('form[data-loki-dirty="true"]')).toHaveAttribute(
        "data-loki-form-dirty",
        "true",
    );
    await expect(page.locator("html")).toHaveAttribute(
        "data-loki-form-dirty",
        "true",
    );
    await expect(page.locator("[data-loki-jump-date-input]")).toHaveValue(
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
    await expect(jumpItemSummary(page, "Location")).toContainText(
        "Image Drop Zone",
    );
    await expect(jumpItemSummary(page, "Aircraft")).toContainText(
        "Image Plane",
    );
    await expect(page.locator('input[name="locationName"]')).toHaveValue("");
    await expect(page.locator('input[name="aircraftName"]')).toHaveValue("");
    await expect(page.locator('input[name="gearName"]')).toHaveValue("");
    await expect(page.locator('input[name="jumpTypeName"]')).toHaveValue("");
    await expect(jumpItemSummary(page, "Gear used")).toContainText(
        "Image Canopy",
    );
    await expect(jumpItemSummary(page, "Jump types")).toContainText("FS");
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "From image mock\n\nRead from a logbook using AI vision",
    );
    await expect(
        page.getByText("Opening altitude was difficult to read"),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Add jump" }).click();
    await expectLogbookAroundJump(page, 42);
    await expect(page.getByRole("link", { name: /#42 / })).toBeVisible();
    await page.getByRole("link", { name: /#42 / }).click();

    await expect(
        page.getByRole("heading", { name: "Source image" }),
    ).toBeVisible();
    await expect(
        page.getByText("This image is stored and shown only in this device."),
    ).toBeVisible();
    await expect(
        page.getByRole("img", { name: "Image used to read jump values" }),
    ).toBeVisible();
    await expect(page.locator("[data-loki-jump-date-input]")).toHaveValue(
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
    await expect(jumpItemSummary(page, "Location")).toContainText(
        "Image Drop Zone",
    );
    await expect(jumpItemSummary(page, "Aircraft")).toContainText(
        "Image Plane",
    );
    await expect(jumpItemSummary(page, "Gear used")).toContainText(
        "Image Canopy",
    );
    await expect(jumpItemSummary(page, "Jump types")).toContainText("FS");
    await expect(page.locator('textarea[name="description"]')).toHaveValue(
        "From image mock\n\nRead from a logbook using AI vision",
    );

    await page.getByRole("link", { name: "AI Vision", exact: true }).click();
    await expect(page).toHaveURL("/logbook/jumps/new/from-image");
    await expect(page.getByText("Read", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Jump #42" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Jump #42" })).toHaveAttribute(
        "href",
        /\/logbook\/jumps\/[0-9a-f-]+/,
    );
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
    await expect(usageRow.getByRole("cell", { name: /1\s200/ })).toBeVisible();
    await expect(usageRow.getByRole("cell", { name: "180" })).toBeVisible();
    await expect(usageRow.getByRole("cell", { name: /1\s380/ })).toBeVisible();
    await expect(
        usageSection
            .locator("p")
            .filter({ hasText: "Input tokens" })
            .locator("..")
            .getByText(/1\s200/),
    ).toBeVisible();

    await page.getByRole("link", { name: "Jump #42" }).click();
    await page.locator('input[name="jumpNumber"]').fill("43");
    await page.getByRole("button", { name: "Save jump" }).click();
    await expectLogbookAroundJump(page, 43);
    await page.getByRole("link", { name: "AI Vision", exact: true }).click();
    await expect(page.getByRole("link", { name: "Jump #43" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Jump #42" })).toHaveCount(0);

    await page
        .locator('textarea[name="additionalContext"]')
        .fill("Mock unreadable required fields");
    await page
        .locator("input[multiple]")
        .setInputFiles(path.join(__dirname, "fixtures/jump-image.png"));
    await page.getByRole("button", { name: "Read image" }).click();

    await expect(page).toHaveURL(/\/logbook\/jumps\/new\?/);
    await expect(page.locator("[data-loki-jump-date-input]")).toHaveValue("");
    await expect(page.locator('input[name="jumpNumber"]')).toHaveValue("");
    await expect(page.locator('input[name="openingAltitude"]')).toHaveValue(
        "900",
    );
    await expect(jumpItemSummary(page, "Location")).toContainText(
        "Image Drop Zone",
    );
    await expect(jumpItemSummary(page, "Aircraft")).toContainText(
        "Image Plane",
    );
    await expect(jumpItemSummary(page, "Gear used")).toContainText(
        "Image Canopy",
    );
    await expect(jumpItemSummary(page, "Jump types")).toContainText("FS");

    await page.goto("/logbook/jumps/new/from-image");
    await page
        .locator('textarea[name="additionalContext"]')
        .fill("Mock multiple jump items");
    await page
        .locator("input[multiple]")
        .setInputFiles(path.join(__dirname, "fixtures/jump-image.png"));
    await page.getByRole("button", { name: "Read image" }).click();

    await expect(jumpItemSummary(page, "Aircraft")).toContainText(
        "Image Plane",
    );
    await expect(page.locator('input[name="aircraftName"]')).toHaveValue(
        "OH-NEW",
    );
    await expect(jumpItemSummary(page, "Gear used")).toContainText(
        "Image Canopy",
    );
    await expect(page.locator('input[name="gearName"]')).toHaveValue(
        "Altimeter",
    );
    await expect(jumpItemSummary(page, "Jump types")).toContainText("FS");
    await expect(page.locator('input[name="jumpTypeName"]')).toHaveValue(
        "Image Special",
    );

    await page.goto("/logbook/jumps/new/from-image");
    await page
        .locator('textarea[name="additionalContext"]')
        .fill("Mock uncertain reading");
    await page
        .locator("input[multiple]")
        .setInputFiles(path.join(__dirname, "fixtures/jump-image.png"));
    await page.getByRole("button", { name: "Read image" }).click();

    await expect(page).toHaveURL(/[?&]warning=/);
    await expect(
        page.getByText(
            "Opening altitude was difficult to read and may be inaccurate.",
        ),
    ).toBeVisible();
    await expect(
        page.getByText(/Ambiguities can be fixed using the/),
    ).toBeVisible();
    await expect(
        page.getByRole("link", { name: "Image reading prompt" }),
    ).toHaveAttribute("href", "/preferences#jump-image-prompt");
    await expect(
        page.getByRole("link", { name: "Preferences" }),
    ).toHaveAttribute("href", "/preferences#openai");
    await expect(
        page.getByRole("link", { name: "Additional context" }),
    ).toHaveAttribute(
        "href",
        "/logbook/jumps/new/from-image#additional-context",
    );

    await page.goto("/logbook/jumps/new/from-image");
    await page
        .locator('textarea[name="additionalContext"]')
        .fill("Mock ambiguous jump");
    await page
        .locator("input[multiple]")
        .setInputFiles(path.join(__dirname, "fixtures/jump-image.png"));
    await page.getByRole("button", { name: "Read image" }).click();

    await expect(page).toHaveURL("/logbook/jumps/new/from-image");
    await expect(
        page.getByText(
            "Multiple jumps are visible. Specify the requested jump number in Additional context.",
        ),
    ).toBeVisible();

    await page.goto("/logbook/jumps/new/from-image");
    await page.getByRole("link", { name: "Jump #43" }).click();
    await openDangerZone(page);
    const deleteButton = page
        .locator("form")
        .filter({
            has: page.locator('input[name="action"][value="delete"]'),
        })
        .getByRole("button");
    await deleteButton.click();
    await expect(deleteButton).toHaveText("Confirm delete", { timeout: 1000 });
    await deleteButton.click();
    await expect(page).toHaveURL("/logbook");
    await page.getByRole("link", { name: "AI Vision", exact: true }).click();
    await expect(page.getByRole("link", { name: "Jump #43" })).toHaveCount(0);
});

test("from image form lists latest images first and can clear them", async ({
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

    await page.getByRole("link", { name: "AI Vision", exact: true }).click();
    await expect(page).toHaveURL("/logbook/jumps/new/from-image");

    // Gallery HTML is an HTMX fragment with its own useId sequence. Steal any
    // Hono :rN: ids from the fragment so getElementById hits a <template> first
    // when JumpImage keys the <img> with useId() instead of the draft id.
    await page.evaluate(() => {
        document.body.insertAdjacentHTML(
            "afterbegin",
            '<template id="stolen-gallery-image-id"></template>',
        );
    });
    await page.route("**/from-image/__gallery**", async (route) => {
        const response = await route.fetch();
        const body = (await response.text()).replaceAll(
            /:r[0-9a-z]+:/g,
            "stolen-gallery-image-id",
        );
        await route.fulfill({ response, body });
    });

    const imageBuffer = fs.readFileSync(
        path.join(__dirname, "fixtures/jump-image.png"),
    );
    await page.locator("input[multiple]").setInputFiles([
        {
            name: "first-image.png",
            mimeType: "image/png",
            buffer: imageBuffer,
        },
        {
            name: "second-image.png",
            mimeType: "image/png",
            buffer: imageBuffer,
        },
    ]);
    await expect(page.getByText(/^2 images\./)).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Clear all images" }),
    ).toBeVisible();
    const galleryNames = page.locator("[data-loki-select-image] img");
    await expect(galleryNames.first()).toHaveAttribute(
        "alt",
        "Selected jump image preview",
    );
    await expect(galleryNames).toHaveCount(2);
    for (const img of await galleryNames.all()) {
        await expect(img).toHaveAttribute("src", /^blob:/);
        await expect(img).toBeVisible();
    }
    await expect
        .poll(() =>
            page.locator('input[name="image"]').evaluate((input) => {
                if (!(input instanceof HTMLInputElement)) {
                    return null;
                }
                return input.files?.[0]?.name ?? null;
            }),
        )
        .toBe("second-image.png");
    await expect(
        page.getByRole("button", { name: "Select first-image.png" }),
    ).toBeVisible();

    // A later batch must keep earlier drafts visible after the HTMX swap.
    await page.locator("input[multiple]").setInputFiles({
        name: "third-image.png",
        mimeType: "image/png",
        buffer: imageBuffer,
    });
    await expect(page.getByText(/^3 images\./)).toBeVisible();
    await expect(galleryNames).toHaveCount(3);
    for (const img of await galleryNames.all()) {
        await expect(img).toHaveAttribute("src", /^blob:/);
        await expect(img).toBeVisible();
    }
    await expect(
        page.getByRole("button", { name: "Select first-image.png" }),
    ).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Select second-image.png" }),
    ).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Select third-image.png" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Delete first-image.png" }).click();
    await expect(page.getByText(/^2 images\./)).toBeVisible();
    await page.reload();
    await expect(
        page.getByText("second-image.png", { exact: false }),
    ).toBeVisible();
    await expect(
        page.getByText("third-image.png", { exact: false }),
    ).toBeVisible();
    await expect(
        page.getByText("first-image.png", { exact: false }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Clear all images" }).click();
    await expect(page.getByText(/^2 images\./)).toHaveCount(0);
    await expect(
        page.getByText("second-image.png", { exact: false }),
    ).toHaveCount(0);
    await expect(
        page.getByText("third-image.png", { exact: false }),
    ).toHaveCount(0);
    await expect(
        page.getByRole("button", { name: "Clear all images" }),
    ).toBeHidden();
});

test("from image form saves model and additional context to user options", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("options-image-skydiver");
    await page
        .locator('input[name="displayName"]')
        .fill("Options Image Skydiver");
    await page
        .locator('input[name="email"]')
        .fill("options-image@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await openMainMenu(page);
    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await expect(page.getByLabel("Default AI model")).toHaveCount(0);
    await page.locator('input[name="openaiApiKey"]').fill("sk-test-key");
    await page.getByRole("button", { name: "Save preferences" }).click();

    await page.getByRole("link", { name: "AI Vision", exact: true }).click();
    await page.locator('select[name="model"]').selectOption("gpt-4o-mini");
    await page
        .locator('textarea[name="additionalContext"]')
        .fill("Remember this context on the server");
    await expect(
        page.getByRole("button", { name: "Clear additional context" }),
    ).toBeVisible();
    await page
        .getByRole("button", { name: "Clear additional context" })
        .click();
    await expect(
        page.locator('textarea[name="additionalContext"]'),
    ).toHaveValue("");
    await expect(
        page.getByRole("button", { name: "Clear additional context" }),
    ).toBeHidden();
    await page
        .locator('textarea[name="additionalContext"]')
        .fill("Remember this context on the server");
    await page
        .locator("input[multiple]")
        .setInputFiles(path.join(__dirname, "fixtures/jump-image.png"));
    await page.getByRole("button", { name: "Read image" }).click();
    await expect(page).toHaveURL(/\/logbook\/jumps\/new\?/);

    await page.goto("/logbook/jumps/new/from-image");
    await expect(page.locator('select[name="model"]')).toHaveValue(
        "gpt-4o-mini",
    );
    await expect(
        page.locator('textarea[name="additionalContext"]'),
    ).toHaveValue("Remember this context on the server");
});

test("from image form describes resized images", async ({ page }) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("resize-skydiver");
    await page.locator('input[name="displayName"]').fill("Resize Skydiver");
    await page.locator('input[name="email"]').fill("resize@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByRole("link", { name: "AI Vision", exact: true }).click();

    await page.evaluate(() => {
        const originalToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function (
            callback,
            type,
            quality,
        ) {
            window.setTimeout(() => {
                originalToBlob.call(this, callback, type, quality);
            }, 250);
        };
    });

    await page.locator("input[multiple]").evaluate(async (input) => {
        const canvas = document.createElement("canvas");
        canvas.width = 4096;
        canvas.height = 4;
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Canvas is unavailable");
        }
        context.fillRect(0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(new Error("Could not create test image"));
                }
            }, "image/png");
        });
        if (!(input instanceof HTMLInputElement)) {
            throw new Error("Image input is unavailable");
        }
        const transfer = new DataTransfer();
        transfer.items.add(new File([blob], "large.png", { type: blob.type }));
        input.files = transfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await expect(
        page.getByRole("button", { name: "Read image" }),
    ).toBeDisabled();

    await expect(
        page.getByText(
            /^Resized from \d+(?:\.\d+)? (?:B|KB|MB) \(4096 x 4\) to \d+(?:\.\d+)? (?:B|KB|MB) \(2048 x 2\)\.$/,
        ),
    ).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Read image" }),
    ).toBeEnabled();
});

test("from image rejects oversized files on the server", async ({ page }) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("oversize-skydiver");
    await page.locator('input[name="displayName"]').fill("Oversize Skydiver");
    await page
        .locator('input[name="email"]')
        .fill("oversize-image@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await openMainMenu(page);
    await page.getByRole("link", { name: "Preferences", exact: true }).click();
    await page.locator('input[name="openaiApiKey"]').fill("sk-test-key");
    await page.getByRole("button", { name: "Save preferences" }).click();
    await page.getByRole("link", { name: "AI Vision", exact: true }).click();

    const responseText = await page.evaluate(async () => {
        const formData = new FormData();
        formData.set(
            "image",
            new File([new Uint8Array(8 * 1024 * 1024 + 1)], "oversize.png", {
                type: "image/png",
            }),
        );
        const response = await fetch(window.location.href, {
            method: "POST",
            body: formData,
        });
        return response.text();
    });

    expect(responseText).toContain("Image is too large. Maximum size is 8 MB.");
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

    await page.getByRole("link", { name: "AI Vision", exact: true }).click();
    await expect(page).toHaveURL("/logbook/jumps/new/from-image");
    await expect(page.getByRole("button", { name: "Paste" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Paste" })).toHaveAttribute(
        "data-loki-tooltip",
        "Paste images from the clipboard",
    );

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
    await expect(page.locator("[data-loki-jump-date-input]")).toHaveValue(
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

    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
    });
    // Reload only after registration finishes so the worker controls the page.
    await page.reload();
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
