import { expect, type Locator, type Page } from "@playwright/test";

export async function expectLogbookAroundJump(
    page: Page,
    jumpNumber: number,
): Promise<void> {
    await expect(page).toHaveURL(/\/logbook/);
    await expect(page).not.toHaveURL(/[?&]goto=/);
    await expect(page.locator(`#jump-${jumpNumber}`)).toBeVisible();
}

export async function openMainMenu(page: Page) {
    await page.getByRole("button", { name: "Menu" }).click();
}

export async function openManageLogbook(page: Page) {
    await openMainMenu(page);
}

export async function openDangerZone(page: Page) {
    await page.getByText("Show destructive actions", { exact: true }).click();
}

export async function logOut(page: Page) {
    await openMainMenu(page);
    await page.getByRole("button", { name: "Log out" }).click();
}

export function jumpItemSummary(page: Page, label: string): Locator {
    return page
        .getByRole("group", { name: label, exact: true })
        .locator(":scope > button");
}

export async function resetFormDirtyForTest(form: Locator) {
    await form.evaluate((element) => {
        if (!(element instanceof HTMLFormElement))
            throw new Error("Expected form");
        delete element.dataset.lokiFormDirty;
        delete document.documentElement.dataset.lokiFormDirty;
    });
}

export async function openJumpItemSelect(
    page: Page,
    label: string,
): Promise<Locator> {
    const group = page.getByRole("group", { name: label, exact: true });
    await group.locator(":scope > button").click();
    return group.locator("dialog");
}

export async function selectJumpItems(
    page: Page,
    label: string,
    itemNames: string[],
) {
    const dialog = await openJumpItemSelect(page, label);
    for (const itemName of itemNames) {
        await dialog.getByLabel(itemName, { exact: true }).check();
    }
    await dialog.getByRole("button", { name: "OK" }).click();
}
