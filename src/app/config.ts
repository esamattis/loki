import { DEFAULT_USER_OPTIONS_JSON } from "./options.ts";

/**
 * Concrete values consumed outside the request-time application composition.
 *
 * Forks replace this module together with the rest of `src/app`. Repository
 * scripts must use this documented contract instead of importing concrete
 * implementation modules such as `options.ts`.
 */
export const appConfig = {
    buildName: "Loki",
    defaultUserOptionsJson: DEFAULT_USER_OPTIONS_JSON,
    executableName: process.platform === "win32" ? "loki.exe" : "loki",
    sqliteFilename: "loki.sqlite",
    storageDirectoryName(platform: NodeJS.Platform = process.platform): string {
        return platform === "win32" ? "Loki" : "loki";
    },
} as const;
