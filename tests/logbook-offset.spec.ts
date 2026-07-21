import { expect, test } from "./fixtures";
import { expectLogbookAroundJump } from "./helpers";

test("offset controls can show previous jumps and clear the offset", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("offset-controls");
    await page.locator('input[name="displayName"]').fill("Offset Controls");
    await page
        .locator('input[name="email"]')
        .fill("offset-controls@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/logbook");

    await page.getByRole("button", { name: "Load example data" }).click();
    await expect(
        page.getByRole("heading", { name: "104 Jumps" }),
    ).toBeVisible();

    const searchInput = page.getByRole("searchbox", { name: "Search jumps" });
    await searchInput.fill("1");
    await page.getByRole("button", { name: "Go to jump number" }).click();
    await expectLogbookAroundJump(page, 1);
    await expect(page).toHaveURL(/[?&]offset=\d+/);

    const showPrevious = page.getByRole("link", {
        name: "Show previous jumps",
    });
    const clearOffset = page.getByRole("link", { name: "Clear offset" });
    await expect(showPrevious).toBeVisible();
    await expect(clearOffset).toBeVisible();

    await expect(showPrevious).toHaveAttribute(
        "data-loki-tooltip",
        "Show more jumps above · keeps scroll near the current top jump",
    );
    await expect(clearOffset).toHaveAttribute(
        "data-loki-tooltip",
        "Return to the start of the logbook",
    );

    const topJumpId = await page
        .locator('[id^="jump-"]')
        .first()
        .getAttribute("id");
    expect(topJumpId).toMatch(/^jump-\d+$/);
    const topJumpNumber = topJumpId!.slice("jump-".length);
    const previousOffset = Number(
        new URL(page.url()).searchParams.get("offset"),
    );
    expect(previousOffset).toBeGreaterThan(0);

    await expect(showPrevious).toHaveAttribute(
        "href",
        new RegExp(`#jump-${topJumpNumber}$`),
    );
    await showPrevious.click();
    await expect(page).toHaveURL(new RegExp(`#jump-${topJumpNumber}$`));
    await expect(page.locator(`#jump-${topJumpNumber}`)).toBeVisible();
    const reducedOffset = Number(
        new URL(page.url()).searchParams.get("offset") ?? "0",
    );
    expect(reducedOffset).toBeLessThan(previousOffset);
    expect(reducedOffset).toBeGreaterThanOrEqual(0);
    // Previous top jump remains on the page near the bottom of the new window.
    await expect(
        page.getByRole("link", { name: new RegExp(`^#${topJumpNumber} `) }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Clear offset" }).click();
    await expect(page).not.toHaveURL(/[?&]offset=/);
    await expect(page).not.toHaveURL(/#jump-/);
    await expect(
        page.getByRole("link", { name: "Show previous jumps" }),
    ).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Clear offset" })).toHaveCount(
        0,
    );
});

test("editing a jump scrolls back to that jump", async ({ page }) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("edit-scroll-jump");
    await page.locator('input[name="displayName"]').fill("Edit Scroll Jump");
    await page
        .locator('input[name="email"]')
        .fill("edit-scroll-jump@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/logbook");

    await page.getByRole("button", { name: "Load example data" }).click();
    await expect(
        page.getByRole("heading", { name: "104 Jumps" }),
    ).toBeVisible();

    await page.getByRole("searchbox", { name: "Search jumps" }).fill("1");
    await page.getByRole("button", { name: "Go to jump number" }).click();
    await expectLogbookAroundJump(page, 1);
    await page.getByRole("link", { name: /^#1 / }).click();
    await expect(page).toHaveURL(/\/logbook\/jumps\//);
    await page
        .locator('textarea[name="description"]')
        .fill("Edited with scroll target");
    await page.getByRole("button", { name: "Save jump" }).click();

    await expectLogbookAroundJump(page, 1);
    await expect(page).toHaveURL(/[?&]offset=/);
    await expect(page).not.toHaveURL(/[?&]goto=/);
    await expect(page.getByText("Edited with scroll target")).toBeVisible();
});
