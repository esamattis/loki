import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function openManageLogbook(page: Page) {
    await page.getByRole("button", { name: "Manage logbook" }).click();
}

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
        usageRow.getByRole("cell", { name: "gpt-5.6-luna" }),
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
