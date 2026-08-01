import {
    expect,
    test as base,
    type APIRequestContext,
    type Page,
} from "@playwright/test";
import { createPlaywrightDatabase, type PlaywrightDatabase } from "./helpers";

type BrowserErrorFixtures = {
    assertNoBrowserErrors: void;
    ignoredBrowserErrorOrigins: string[];
};

type DatabaseWorkerFixtures = {
    db: PlaywrightDatabase;
};

function isIgnoredErrorUrl(url: string, origins: string[]): boolean {
    return origins.some((origin) => url.startsWith(`${origin}/`));
}

function isIgnoredPageError(error: Error, origins: string[]): boolean {
    const details = error.stack ?? error.message;
    return origins.some((origin) => details.includes(`${origin}/`));
}

export const test = base.extend<BrowserErrorFixtures, DatabaseWorkerFixtures>({
    ignoredBrowserErrorOrigins: [[], { option: true }],
    assertNoBrowserErrors: [
        async ({ context, ignoredBrowserErrorOrigins }, use) => {
            const errors: string[] = [];

            function observePage(page: Page) {
                page.on("console", (message) => {
                    if (
                        message.type() === "error" &&
                        message.args().length > 0 &&
                        !isIgnoredErrorUrl(
                            message.location().url,
                            ignoredBrowserErrorOrigins,
                        )
                    ) {
                        errors.push(`Console error: ${message.text()}`);
                    }
                });
                page.on("pageerror", (error) => {
                    if (isIgnoredPageError(error, ignoredBrowserErrorOrigins)) {
                        return;
                    }
                    errors.push(
                        `Uncaught error: ${error.stack ?? error.message}`,
                    );
                });
            }

            for (const page of context.pages()) {
                observePage(page);
            }
            context.on("page", observePage);

            await use();

            expect(
                errors,
                "Browser errors were logged during the test",
            ).toEqual([]);
        },
        { auto: true },
    ],
    db: [
        // eslint-disable-next-line no-empty-pattern -- Playwright requires fixture dependency destructuring.
        async ({}, use) => {
            const database = await createPlaywrightDatabase();
            await use(database.db);
            await database.dispose();
        },
        { scope: "worker" },
    ],
});

export { expect, type APIRequestContext, type Page, type PlaywrightDatabase };
