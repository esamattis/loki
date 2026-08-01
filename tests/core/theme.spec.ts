import { expect, test } from "./fixtures";

test.describe("without JavaScript", () => {
    test.use({ colorScheme: "dark", javaScriptEnabled: false });

    test("uses the system theme", async ({ page }) => {
        await page.goto("/");

        await expect(page.locator("body")).toHaveCSS(
            "background-color",
            "oklch(0.129 0.042 264.695)",
        );
    });
});
