import { type Locator, type Page } from "@playwright/test";

export async function openMainMenu(page: Page) {
    await page.getByRole("button", { name: "Menu" }).click();
}
export async function openManageLogbook(page: Page) {
    await openMainMenu(page);
}
export async function openDangerZone(page: Page) {
    await page
        .getByText("Show destructive actions", { exact: true })
        .first()
        .click();
}
export async function logOut(page: Page) {
    await openMainMenu(page);
    await page.getByRole("button", { name: "Log out" }).click();
}
export async function acceptPrivacyPolicyIfRequired(page: Page) {
    if (new URL(page.url()).pathname !== "/privacy") return;
    await page.locator('input[name="accepted"]').check();
    await page
        .getByRole("button", { name: "Accept terms & privacy policy" })
        .click();
}
export async function resetFormDirtyForTest(form: Locator) {
    await form.evaluate((element) => {
        if (!(element instanceof HTMLFormElement))
            throw new Error("Expected form");
        delete element.dataset.lokiFormDirty;
        delete document.documentElement.dataset.lokiFormDirty;
    });
}
