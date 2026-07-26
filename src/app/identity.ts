import type { User } from "@/core/create-app";

export const repositoryUrl = "https://github.com/esamattis/loki";
export const buildName = "Loki";
export const sqliteFilename = "loki.sqlite";
export const navigationLabel = "Logbook actions";

export function authenticatedUserSubtitle(user: User): string {
    return `${user.getDisplayName()}'s logbook`;
}

export function storageDirectoryName(
    platform: NodeJS.Platform = process.platform,
): string {
    return platform === "win32" ? "Loki" : "loki";
}
