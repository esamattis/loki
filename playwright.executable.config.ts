import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const executableName = process.platform === "win32" ? "loki.exe" : "loki";
const executablePath = resolve("dist-executable", executableName);
const sqliteDirectory = resolve(".playwright/executable/sqlite");

export default defineConfig({
    testDir: "./tests-executable",
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: "html",
    outputDir: "test-results/executable",
    use: {
        baseURL: "http://127.0.0.1:8790",
        locale: "sv-SE",
        colorScheme: "light",
        trace: "on-first-retry",
        ...devices["Desktop Chrome"],
    },
    webServer: {
        command: `node scripts/reset-executable-test-state.ts && "${executablePath}" --host 127.0.0.1 --port 8790 --sqlite-dir "${sqliteDirectory}"`,
        url: "http://127.0.0.1:8790",
        reuseExistingServer: false,
    },
});
