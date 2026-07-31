import {
    expect,
    test as base,
    type APIRequestContext,
    type Page,
} from "@playwright/test";
import {
    createPlaywrightDatabase,
    type PlaywrightDatabase,
} from "./core/helpers";

type BrowserErrorFixtures = {
    assertNoBrowserErrors: void;
};

type DatabaseWorkerFixtures = {
    db: PlaywrightDatabase;
};

const THIRD_PARTY_ERROR_ORIGINS = ["https://www.youtube.com"];

function isThirdPartyErrorUrl(url: string): boolean {
    return THIRD_PARTY_ERROR_ORIGINS.some((origin) =>
        url.startsWith(`${origin}/`),
    );
}

function isThirdPartyPageError(error: Error): boolean {
    const details = error.stack ?? error.message;
    return THIRD_PARTY_ERROR_ORIGINS.some((origin) =>
        details.includes(`${origin}/`),
    );
}

export const test = base.extend<BrowserErrorFixtures, DatabaseWorkerFixtures>({
    assertNoBrowserErrors: [
        async ({ context }, use) => {
            const errors: string[] = [];

            function observePage(page: Page) {
                page.on("console", (message) => {
                    if (
                        message.type() === "error" &&
                        message.args().length > 0 &&
                        !isThirdPartyErrorUrl(message.location().url)
                    ) {
                        errors.push(`Console error: ${message.text()}`);
                    }
                });
                page.on("pageerror", (error) => {
                    if (isThirdPartyPageError(error)) return;
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
