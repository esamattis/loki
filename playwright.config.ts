import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests",
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: "html",
    use: {
        baseURL: "http://127.0.0.1:8788",
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: {
        command:
            "PLAYWRIGHT_TEST=1 node scripts/reset-playwright-state.ts && PLAYWRIGHT_TEST=1 node scripts/migrate-playwright.ts && PLAYWRIGHT_TEST=1 vite --host 127.0.0.1 --port 8788 --strictPort",
        url: "http://127.0.0.1:8788",
        reuseExistingServer: false,
    },
});
