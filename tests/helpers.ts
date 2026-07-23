import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { expect, type Locator, type Page } from "@playwright/test";
import { wranglerBin } from "../scripts/wrangler-bin";

const execFile = promisify(execFileCallback);

export type D1ExecuteResult = {
    results: Array<Record<string, number | string | null>>;
};

export async function executePlaywrightDb(
    sql: string,
): Promise<D1ExecuteResult[]> {
    const { stdout } = await execFile(process.execPath, [
        wranglerBin(),
        "d1",
        "execute",
        "DB",
        "--local",
        "--persist-to",
        ".playwright/state",
        "--json",
        "--command",
        sql,
    ]);
    return JSON.parse(stdout);
}

export async function queryPlaywrightDb(
    sql: string,
): Promise<Array<Record<string, number | string | null>>> {
    return (await executePlaywrightDb(sql))[0]?.results ?? [];
}

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

/** Fill jump number and wait for the HTMX conflict check to finish. */
export async function setJumpNumber(page: Page, value: string) {
    const jumpNumber = page.locator('input[name="jumpNumber"]');
    const responsePromise = page.waitForResponse((response) => {
        if (!response.ok()) {
            return false;
        }
        const url = new URL(response.url());
        return (
            url.pathname === "/logbook/jumps/new/__jump-number-error" &&
            url.searchParams.get("jumpNumber") === value
        );
    });
    await jumpNumber.fill(value);
    await jumpNumber.blur();
    await responsePromise;
}
