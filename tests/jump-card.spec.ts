import { expect, test } from "./fixtures";
import { expectLogbookAroundJump } from "./helpers";

test("truncated jump notes can be fully shown", async ({ page }) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("long-jump-notes");
    await page.locator('input[name="displayName"]').fill("Long Jump Notes");
    await page.locator('input[name="email"]').fill("long-notes@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    const longNotes = "These are long jump notes. ".repeat(20);
    await page.locator('textarea[name="description"]').fill(longNotes);
    await page.getByRole("button", { name: "Add jump" }).click();

    const card = page.getByRole("listitem").filter({
        has: page.getByRole("link", { name: /#1/ }),
    });
    const notes = card.getByText(longNotes);
    const showAll = card.getByRole("button", { name: "Show all" });
    await expect(showAll).toBeVisible();
    await expect(notes).toHaveClass(/line-clamp-2/);

    await showAll.click();
    await expectLogbookAroundJump(page, 1);
    await expect(notes).not.toHaveClass(/line-clamp-2/);
    await expect(showAll).toBeHidden();

    await card.scrollIntoViewIfNeeded();
    const cardBox = await card.boundingBox();
    if (!cardBox) {
        throw new Error("Jump card has no bounding box");
    }
    await page.mouse.click(
        cardBox.x + cardBox.width / 2,
        cardBox.y + cardBox.height - 2,
    );
    await expect(page).toHaveURL(/\/logbook\/jumps\/[^/]+$/);
});
