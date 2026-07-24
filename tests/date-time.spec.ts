import { acceptPrivacyPolicyIfRequired } from "./helpers";
import path from "node:path";
import { expect, test, type Page } from "./fixtures";
import { openMainMenu, openManageLogbook } from "./helpers";
import { formatCalendarDate, formatUnixDateTime } from "@/date-time";
import {
    createCalendarDurationFormatter,
    createNumberFormatter,
} from "@/format";

const xmlFixturePath = path.join(
    import.meta.dirname,
    "fixtures/skydiving-logbook.xml",
);

async function registerUser(page: Page) {
    await page.goto("/register");
    await page.locator('input[name="invitationCode"]').fill("test-invite");
    await page.locator('input[name="username"]').fill("date-time-skydiver");
    await page.locator('input[name="displayName"]').fill("Date Time Skydiver");
    await page
        .locator('input[name="email"]')
        .fill("date-time-skydiver@example.test");
    await page.locator('input[name="password"]').fill("parachute");
    await page.locator('input[name="confirmPassword"]').fill("parachute");
    await page.getByRole("button", { name: "Create account" }).click();
    await acceptPrivacyPolicyIfRequired(page);
    await expect(page).toHaveURL("/logbook");
}

test("formats calendar dates using each preference", () => {
    expect(formatCalendarDate("2026-07-14", "finnish")).toBe("14.7.2026");
    expect(formatCalendarDate("2026-07-14", "european")).toBe("14/07/2026");
    expect(formatCalendarDate("2026-07-14", "american")).toBe("07/14/2026");
    expect(formatCalendarDate("2026-07-14", "iso")).toBe("2026-07-14");
});

test("formats Unix timestamps in UTC using each preference", () => {
    const timestamp = Date.UTC(2026, 6, 14, 16, 5, 30) / 1000;
    expect(formatUnixDateTime(timestamp, "finnish")).toBe(
        "14.7.2026 klo 16.05.30 UTC",
    );
    expect(formatUnixDateTime(timestamp, "european")).toBe(
        "14/07/2026, 16:05:30 UTC",
    );
    expect(formatUnixDateTime(timestamp, "american")).toBe(
        "07/14/2026, 4:05:30 PM UTC",
    );
    expect(formatUnixDateTime(timestamp, "iso")).toBe(
        "2026-07-14 16:05:30 UTC",
    );
});

test("formats calendar durations with the user's number format", () => {
    const formatDuration = createCalendarDurationFormatter(
        createNumberFormatter("space-comma"),
    );
    expect(formatDuration({ months: 1, weeks: 0, days: 2 })).toBe(
        "1 month, 0 weeks, 2 days",
    );
});

test("date format preferences apply to rendered jump dates", async ({
    page,
}) => {
    await registerUser(page);
    await openManageLogbook(page);
    await page.getByRole("link", { name: "Import or export" }).click();
    await page.locator('input[name="file"]').setInputFiles(xmlFixturePath);
    await page.getByRole("button", { name: "Import logbook" }).click();
    await page
        .getByRole("link", { name: /Date Time Skydiver's logbook/ })
        .click();

    const formats = [
        { value: "finnish", renderedDate: "15.6.2024" },
        { value: "european", renderedDate: "15/06/2024" },
        { value: "american", renderedDate: "06/15/2024" },
        { value: "iso", renderedDate: "2024-06-15" },
    ];

    for (const format of formats) {
        await page.goto("/logbook");
        await openMainMenu(page);
        await page
            .getByRole("link", { name: "Preferences", exact: true })
            .click();
        await page
            .locator('select[name="dateTimeFormat"]')
            .selectOption(format.value);
        await page.getByRole("button", { name: "Save preferences" }).click();

        await expect(page).toHaveURL("/logbook");
        await expect(page.getByRole("link", { name: /#401/ })).toContainText(
            `Sat, ${format.renderedDate}`,
        );
        await page.getByRole("link", { name: /#401/ }).click();
        await expect(page.locator("[data-loki-jump-date-input]")).toHaveValue(
            format.renderedDate,
        );
    }
});
