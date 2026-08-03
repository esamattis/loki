import { expect, test } from "./fixtures";

test("touch tooltips stay open until the next touch starts", async ({
    page,
}) => {
    await page.goto("/");

    const target = page.getByRole("button", { name: /^Theme:/ });
    const tooltip = page.getByRole("tooltip");
    const tooltipText = await target.getAttribute("data-loki-tooltip");

    await target.dispatchEvent("touchstart");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText(tooltipText!);

    await target.dispatchEvent("pointerout", { pointerType: "touch" });
    await expect(tooltip).toBeVisible();

    await page.locator("body").dispatchEvent("touchstart");
    await expect(tooltip).toBeHidden();
});
