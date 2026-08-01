import { test as coreTest } from "../core/fixtures";

export const test = coreTest.extend({
    ignoredBrowserErrorOrigins: ["https://www.youtube.com"],
});

export {
    expect,
    type APIRequestContext,
    type Page,
    type PlaywrightDatabase,
} from "../core/fixtures";
