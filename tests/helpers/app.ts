import { expect, type Locator, type Page } from "@playwright/test";

export async function expectLogbookAroundJump(page: Page, jumpNumber: number) {
    await expect(page).toHaveURL(/\/logbook/);
    await expect(page).not.toHaveURL(/[?&]goto=/);
    await expect(page.locator(`#jump-${jumpNumber}`)).toBeVisible();
}
export function jumpItemSummary(page: Page, label: string): Locator {
    return page
        .getByRole("group", { name: label, exact: true })
        .locator(":scope > button");
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
    for (const itemName of itemNames)
        await dialog.getByLabel(itemName, { exact: true }).check();
    await dialog.getByRole("button", { name: "OK" }).click();
}
export async function setJumpNumber(page: Page, value: string) {
    const jumpNumber = page.locator('input[name="jumpNumber"]');
    const responsePromise = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return (
            response.ok() &&
            url.pathname === "/logbook/jumps/new/__jump-number-error" &&
            url.searchParams.get("jumpNumber") === value
        );
    });
    await jumpNumber.fill(value);
    await jumpNumber.blur();
    await responsePromise;
}
