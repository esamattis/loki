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
            "PLAYWRIGHT_TEST=1 node scripts/reset-playwright-state.ts && PLAYWRIGHT_TEST=1 wrangler d1 execute DB --local --persist-to .playwright/state --file drizzle/0000_sloppy_terror.sql && PLAYWRIGHT_TEST=1 wrangler d1 execute DB --local --persist-to .playwright/state --file drizzle/0001_complete_lake.sql && PLAYWRIGHT_TEST=1 wrangler d1 execute DB --local --persist-to .playwright/state --file drizzle/0002_absent_angel.sql && PLAYWRIGHT_TEST=1 wrangler d1 execute DB --local --persist-to .playwright/state --file drizzle/0003_sweet_ghost_rider.sql && PLAYWRIGHT_TEST=1 vite --host 127.0.0.1 --port 8788 --strictPort",
        url: "http://127.0.0.1:8788",
        reuseExistingServer: false,
    },
});
