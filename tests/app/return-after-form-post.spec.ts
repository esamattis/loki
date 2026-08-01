import { acceptPrivacyPolicyIfRequired } from "./helpers";
import { expect, test } from "./fixtures";

test("editing two gear items in a row returns to the gear list", async ({
    page,
}) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page
        .locator('input[name="username"]')
        .fill("return-route-gear-chain");
    await page.locator('input[name="displayName"]').fill("Return Route Gear");
    await page
        .locator('input[name="email"]')
        .fill("return-route-gear-chain@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await acceptPrivacyPolicyIfRequired(page);
    await expect(page).toHaveURL("/logbook");

    // Start on the list with no prior return route so a save must use the
    // server list redirect (not jump back to an earlier page).
    await page.goto("/logbook/gear");
    await page.evaluate(() => {
        sessionStorage.removeItem("return-after-form-post");
        sessionStorage.removeItem("return-after-form-post-destination");
        sessionStorage.removeItem("return-after-form-post-pending");
    });
    await expect(page).toHaveURL("/logbook/gear");

    await page
        .getByRole("listitem")
        .filter({ has: page.getByText("PD Navigator", { exact: true }) })
        .getByRole("link", { name: "Edit" })
        .click();
    await expect(page).toHaveURL(/\/logbook\/gear\/[^/]+$/);
    const firstEditUrl = page.url();
    await page.locator('input[name="name"]').fill("PD Navigator edited");
    await page.getByRole("button", { name: "Save gear" }).click();
    await expect(page).toHaveURL("/logbook/gear");
    await expect(
        page.getByText("PD Navigator edited", { exact: true }),
    ).toBeVisible();

    await page
        .getByRole("listitem")
        .filter({ has: page.getByText("PD Sabre 2", { exact: true }) })
        .getByRole("link", { name: "Edit" })
        .click();
    await expect(page).toHaveURL(/\/logbook\/gear\/[^/]+$/);
    expect(page.url()).not.toBe(firstEditUrl);
    await page.locator('input[name="name"]').fill("PD Sabre 2 edited");
    await page.getByRole("button", { name: "Save gear" }).click();
    await expect(page).toHaveURL("/logbook/gear");
    await expect(
        page.getByText("PD Sabre 2 edited", { exact: true }),
    ).toBeVisible();
    await expect(page).not.toHaveURL(firstEditUrl);
});
