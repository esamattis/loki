import { expect, test } from "./fixtures";

test("includes social sharing metadata", async ({ page }) => {
    await page.goto("/");

    const origin = new URL(page.url()).origin;
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        /open source digital skydiving logbook/i,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
        "content",
        "Loki - Skydiving Logbook",
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
        "content",
        "website",
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
        "content",
        `${origin}/`,
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        "content",
        `${origin}/og-image.png`,
    );
    await expect(
        page.locator('meta[property="og:image:width"]'),
    ).toHaveAttribute("content", "1200");
    await expect(
        page.locator('meta[property="og:image:height"]'),
    ).toHaveAttribute("content", "630");
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        "content",
        "summary_large_image",
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
        "content",
        `${origin}/og-image.png`,
    );
});

test("shows download and invite actions in both calls to action", async ({
    page,
}) => {
    await page.goto("/");

    const downloads = page.getByRole("link", { name: "Download" });
    const signups = page.getByRole("link", { name: "Sign up with invite" });
    await expect(downloads).toHaveCount(2);
    await expect(downloads.first()).toHaveAttribute(
        "href",
        "https://github.com/esamattis/loki/releases",
    );
    await expect(page.getByRole("button", { name: "Try demo" })).toHaveCount(2);
    expect(
        await page
            .locator(
                'iframe[title="Loki product video"], button:text-is("Try demo")',
            )
            .evaluateAll((elements) => elements[0]?.tagName),
    ).toBe("BUTTON");
    expect(
        await page
            .locator(
                'iframe[title="Loki product video"], a[href="https://github.com/esamattis/loki/releases"]',
            )
            .evaluateAll((elements) => elements[0]?.tagName),
    ).toBe("IFRAME");
    await expect(signups).toHaveCount(2);
    await expect(signups.first()).toHaveAttribute("href", "/register");
    await expect(
        page.getByRole("link", { name: "(.csv) backup", exact: true }),
    ).toHaveAttribute(
        "href",
        "https://github.com/esamattis/loki/blob/main/src/example-logbook.csv",
    );
});

test("fits the landing page within a small viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    await expect(page.getByText("Skydiving Logbook").first()).toBeHidden();
    const pageWidth = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
    }));
    expect(pageWidth.scroll).toBe(pageWidth.client);
});

test("the landing page remains visible after logging in", async ({ page }) => {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("landing-page-user");
    await page
        .locator('input[name="email"]')
        .fill("landing-page-user@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL("/logbook");

    await page.goto("/");

    await expect(page).toHaveURL("/");
    await expect(
        page.getByRole("heading", {
            name: "Your jumps, your gear, your data.",
        }),
    ).toBeVisible();
    await expect(
        page.getByText("invite-only hosted version").first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Log in" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Sign up" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Download" })).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Try demo" })).toHaveCount(2);
    await expect(
        page.getByRole("link", { name: "Open your logbook" }),
    ).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Home" })).toHaveAttribute(
        "href",
        "/",
    );
});
