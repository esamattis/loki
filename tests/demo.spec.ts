import { expect, test } from "./fixtures";
import { logOut } from "./helpers";

test("try demo logs in with example data and blocks writes", async ({
    page,
}) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Try demo" }).first().click();
    await expect(page).toHaveURL("/logbook");
    await expect(
        page.getByRole("heading", { name: "622 Jumps" }),
    ).toBeVisible();
    await expect(
        page.getByRole("link", {
            name: /#622\b.*Wingsuit.*Skydive Chicago.*Twin Otter/,
        }),
    ).toBeVisible();

    await page.goto("/logbook/jumps/new");
    await expect(page.getByRole("button", { name: "Add jump" })).toBeVisible();
    const blocked = await page.request.post("/logbook/jumps/new", {
        form: {
            jumpNumber: "9999",
            jumpDate: "2020-01-01",
            exitAltitude: "4000",
            openingAltitude: "1000",
            freefallTime: "60",
        },
        maxRedirects: 0,
    });
    expect(blocked.status()).toBe(302);
    expect(blocked.headers().location).toBe("/readonly");

    await page.goto("/readonly");
    await expect(
        page.getByRole("heading", { name: "Read-only account" }),
    ).toBeVisible();
    await expect(
        page.getByText("This account is read-only", { exact: false }),
    ).toBeVisible();

    await logOut(page);
    await expect(page).toHaveURL("/login");
});
