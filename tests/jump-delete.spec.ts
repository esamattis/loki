import { expect, test, type Page } from "@playwright/test";

async function openManageLogbook(page: Page) {
    await page.getByRole("button", { name: "Manage logbook" }).click();
}

async function registerAndAddFirstJump(
    page: Page,
    username: string,
    displayName: string,
) {
    await page.goto("/register");
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="displayName"]').fill(displayName);
    await page.locator('input[name="email"]').fill(`${username}@example.test`);
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL("/logbook");

    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage locations" }).click();
    await page.getByRole("link", { name: "Add location" }).click();
    await page.locator('input[name="name"]').fill("Delete Drop Zone");
    await page.getByRole("button", { name: "Add location" }).click();

    await page.getByRole("link", { name: `${displayName}'s logbook` }).click();
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Manage aircraft" }).click();
    await page.getByRole("link", { name: "Add aircraft" }).click();
    await page.locator('input[name="name"]').fill("Delete Plane");
    await page.getByRole("button", { name: "Add aircraft" }).click();

    await page.getByRole("link", { name: `${displayName}'s logbook` }).click();
    await page.getByRole("link", { name: "Add jump", exact: true }).click();
    await page.locator('input[name="jumpNumber"]').fill("1");
    await page.locator('input[name="exitAltitude"]').fill("4000");
    await page.locator('input[name="openingAltitude"]').fill("1000");
    await page.locator('input[name="freefallTime"]').fill("55");
    await page.locator('select[name="locationUuid"]').selectOption({
        label: "Delete Drop Zone",
    });
    await page.locator('select[name="aircraftUuid"]').selectOption({
        label: "Delete Plane",
    });
    await page.locator('textarea[name="description"]').fill("Doomed jump");
    await page.getByRole("button", { name: "Add jump" }).click();

    await expect(page).toHaveURL("/logbook");
    await expect(page.getByRole("link", { name: /#1/ })).toBeVisible();
}

function deleteButton(page: Page) {
    return page
        .locator("form")
        .filter({
            has: page.locator('input[name="action"][value="delete"]'),
        })
        .getByRole("button");
}

test("a jump can be deleted from the edit view after the countdown elapses", async ({
    page,
}) => {
    await registerAndAddFirstJump(
        page,
        "deleting-skydiver",
        "Deleting Skydiver",
    );

    await page.getByRole("link", { name: /#1/ }).click();
    await expect(page).toHaveURL(/\/logbook\/jumps\//);
    await expect(page.getByText("Danger zone")).toBeVisible();

    const button = deleteButton(page);
    await expect(button).toHaveText("Delete jump");

    // First click arms the countdown without deleting.
    await button.click();
    await expect(button).toHaveText(/Confirm delete \(\d+s\)/);

    // Wait for the countdown to elapse and the button to become ready.
    await expect(button).toHaveText("Confirm delete", { timeout: 8000 });

    // Now a click confirms and deletes the jump.
    await button.click();

    await expect(page).toHaveURL("/logbook");
    await expect(page.getByRole("link", { name: /#1/ })).toHaveCount(0);
    await expect(page.getByText("Doomed jump")).toHaveCount(0);
});

test("the delete button looks inactive while the countdown is running", async ({
    page,
}) => {
    await registerAndAddFirstJump(
        page,
        "countdown-skydiver",
        "Countdown Skydiver",
    );

    await page.getByRole("link", { name: /#1/ }).click();
    const button = deleteButton(page);

    await button.click();
    await expect(button).toHaveText(/Confirm delete \(\d+s\)/);
    // The button is disabled (inactive) and shows a not-allowed cursor while counting.
    await expect(button).toBeDisabled();
    await expect(button).toHaveClass(/cursor-not-allowed/);
    await expect(button).toHaveClass(/opacity-50/);

    // Once the countdown elapses the button becomes active again.
    await expect(button).toBeEnabled({ timeout: 8000 });
    await expect(button).not.toHaveClass(/cursor-not-allowed/);
    await expect(button).not.toHaveClass(/opacity-50/);
    await expect(page).toHaveURL(/\/logbook\/jumps\//);
});
