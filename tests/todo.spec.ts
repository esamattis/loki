import { expect, test } from "./fixtures";

test("manages todos without losing the new task input", async ({ page }) => {
    await page.goto("/todo");

    await expect(
        page.getByRole("heading", { name: "Todo list" }),
    ).toBeVisible();
    await expect(page.getByText("No tasks yet.")).toBeVisible();

    const input = page.getByRole("textbox", { name: "New task" });
    await input.fill("Buy milk");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("1 task remaining")).toBeVisible();

    await input.fill("Draft survives rerender");
    await page.getByRole("checkbox", { name: "Buy milk" }).check();
    await expect(input).toHaveValue("Draft survives rerender");
    await expect(page.getByText("0 tasks remaining")).toBeVisible();

    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("1 task remaining")).toBeVisible();
    await page.getByRole("button", { name: "Delete Buy milk" }).click();
    await expect(page.getByText("Buy milk")).toHaveCount(0);
    await expect(page.getByText("Draft survives rerender")).toBeVisible();
});
