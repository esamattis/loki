import { acceptPrivacyPolicyIfRequired } from "./helpers";
import { expect, test, type Page } from "./fixtures";
import { openMainMenu } from "./helpers";

async function registerUser(page: Page, username: string, displayName: string) {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="displayName"]').fill(displayName);
    await page.locator('input[name="email"]').fill(`${username}@example.test`);
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await acceptPrivacyPolicyIfRequired(page);
    await expect(page).toHaveURL("/logbook");
}

async function expectActiveAction(
    navigation: ReturnType<Page["getByRole"]>,
    activeLabel: string,
) {
    const labels = ["Logbook", "Statistics", "Add jump", "AI Vision"];

    for (const label of labels) {
        const link = navigation.getByRole("link", { name: label, exact: true });
        if (label === activeLabel) {
            await expect(link).toHaveAttribute("aria-current", "page");
        } else {
            await expect(link).not.toHaveAttribute("aria-current");
        }
    }
}

test("desktop header marks the active action", async ({ page }) => {
    await registerUser(page, "desktop-nav-skydiver", "Desktop Nav Skydiver");

    const header = page.getByRole("banner");
    await expectActiveAction(header, "Logbook");
    await expect(
        page.getByRole("heading", { name: "Start your logbook" }),
    ).toBeVisible();
    await expect(
        page.getByRole("link", { name: "Add your first jump" }),
    ).toHaveAttribute("href", "/logbook/jumps/new");
    await expect(page.getByRole("link", { name: "CSV file" })).toHaveAttribute(
        "href",
        "/logbook/transfer",
    );
    await expect(
        page.getByRole("link", { name: "AI vision", exact: true }),
    ).toHaveAttribute("href", "/logbook/jumps/new/from-image");

    await page.goto("/logbook/statistics");
    await expectActiveAction(header, "Statistics");

    await page.goto("/logbook/jumps/new");
    await expectActiveAction(header, "Add jump");

    await page.goto("/logbook/jumps/new/from-image");
    await expectActiveAction(header, "AI Vision");
});

test("mobile navigation uses the bottom bar for actions and menu", async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await registerUser(page, "mobile-nav-skydiver", "Mobile Nav Skydiver");

    const bottomBar = page.getByRole("navigation", {
        name: "Logbook actions",
    });
    await expect(bottomBar).toBeVisible();
    await expect(
        bottomBar.getByRole("link", { name: "Logbook", exact: true }),
    ).toBeVisible();
    await expect(
        bottomBar.getByRole("link", { name: "Statistics", exact: true }),
    ).toBeVisible();
    await expect(
        bottomBar.getByRole("link", { name: "Add jump", exact: true }),
    ).toBeVisible();
    await expect(
        bottomBar.getByRole("link", { name: "AI Vision", exact: true }),
    ).toBeVisible();
    await expect(bottomBar.getByRole("button", { name: "Menu" })).toBeVisible();
    await expectActiveAction(bottomBar, "Logbook");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const footerLinksBox = await page
        .getByRole("navigation", { name: "Footer" })
        .boundingBox();
    const bottomBarBox = await bottomBar.boundingBox();
    expect(footerLinksBox).not.toBeNull();
    expect(bottomBarBox).not.toBeNull();
    expect(footerLinksBox!.y + footerLinksBox!.height).toBeLessThanOrEqual(
        bottomBarBox!.y,
    );
    await page.evaluate(() => window.scrollTo(0, 0));

    await bottomBar
        .getByRole("link", { name: "Add jump", exact: true })
        .click();
    await expect(page).toHaveURL(/\/logbook\/jumps\/new/);
    await expectActiveAction(bottomBar, "Add jump");
    await expect(
        page
            .getByLabel("Form actions")
            .getByRole("button", { name: "Add jump" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Cancel" })).toHaveCount(0);

    await page.goto("/logbook/jumps/new");
    await bottomBar.getByRole("link", { name: "Logbook", exact: true }).click();
    await expect(page).toHaveURL("/logbook");

    await bottomBar
        .getByRole("link", { name: "AI Vision", exact: true })
        .click();
    await expect(page).toHaveURL("/logbook/jumps/new/from-image");
    await expectActiveAction(bottomBar, "AI Vision");
    await expect(
        page
            .getByLabel("Form actions")
            .getByRole("button", { name: "Read image" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Cancel" })).toHaveCount(0);

    await page.goto("/logbook");
    await openMainMenu(page);
    await expect(page.getByRole("link", { name: "Preferences" })).toBeVisible();
    await page.getByRole("link", { name: "Preferences" }).click();
    await expect(page).toHaveURL("/preferences");
    await expect(
        page
            .getByLabel("Form actions")
            .getByRole("button", { name: "Save preferences" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Cancel" })).toHaveCount(0);
    await expect(
        page.getByRole("heading", { name: "Install app" }),
    ).not.toBeVisible();

    await openMainMenu(page);
    await page.getByRole("link", { name: "Install app" }).click();
    await expect(page).toHaveURL("/install");
    await expect(
        page.getByRole("heading", { name: "Install app" }),
    ).toBeVisible();
});

test("restored pages clear stale navigation and form progress", async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await registerUser(page, "back-nav-skydiver", "Back Nav Skydiver");
    await page.locator("body").waitFor();

    await page.evaluate(() => {
        const progress = document.createElement("div");
        progress.id = "form-submit-progress";
        progress.setAttribute("role", "progressbar");
        progress.setAttribute("aria-label", "Loading page");
        document.body.appendChild(progress);

        const form = document.createElement("form");
        form.id = "restored-form-test";
        form.setAttribute("aria-busy", "true");
        const button = document.createElement("button");
        button.disabled = true;
        button.setAttribute("data-loki-disabled-on-submit", "");
        button.classList.add("form-submit-pending");
        const spinner = document.createElement("span");
        spinner.classList.add("form-submit-spinner");
        button.appendChild(spinner);
        form.appendChild(button);
        document.body.appendChild(form);

        window.dispatchEvent(
            new PageTransitionEvent("pageshow", { persisted: true }),
        );
    });

    await expect(
        page.getByRole("progressbar", { name: "Loading page" }),
    ).toHaveCount(0);
    await expect(page.locator(".form-submit-spinner")).toHaveCount(0);
    await expect(page.locator("form[aria-busy]")).toHaveCount(0);
    await expect(page.locator("button.form-submit-pending")).toHaveCount(0);
    await expect(page.locator("#restored-form-test button")).toBeEnabled();
});

test("Android Brave users are advised to install with Chrome", async ({
    page,
}) => {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, "brave", {
            configurable: true,
            value: {},
        });
        Object.defineProperty(navigator, "userAgent", {
            configurable: true,
            value: "Mozilla/5.0 (Linux; Android 15) Chrome/136.0 Mobile",
        });
    });
    await registerUser(page, "brave-skydiver", "Brave Skydiver");
    await page.goto("/install");

    await expect(page.getByText(/install this app using Chrome/)).toBeVisible();
});

test("an installed Android app shows Android uninstall instructions", async ({
    page,
}) => {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, "userAgent", {
            configurable: true,
            value: "Mozilla/5.0 (Linux; Android 15) Chrome/136.0 Mobile",
        });
        Object.defineProperty(navigator, "standalone", {
            configurable: true,
            value: true,
        });
    });
    await registerUser(page, "android-app-skydiver", "Android App Skydiver");
    await page.goto("/install");

    await expect(page.getByText(/touch and hold the Loki icon/)).toContainText(
        "App info",
    );
    await expect(page.getByText(/touch and hold the Loki icon/)).toContainText(
        "Uninstall",
    );
});

test("an installed iPhone app shows iOS uninstall instructions", async ({
    page,
}) => {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, "userAgent", {
            configurable: true,
            value: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
        });
        Object.defineProperty(navigator, "standalone", {
            configurable: true,
            value: true,
        });
    });
    await registerUser(page, "iphone-app-skydiver", "iPhone App Skydiver");
    await page.goto("/install");

    await expect(page.getByText(/touch and hold the Loki icon/)).toContainText(
        "Remove App and Delete App",
    );
});
