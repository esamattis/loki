import type { User } from "@/core/create-app";

export const repositoryUrl = "https://github.com/esamattis/loki";
export const navigationLabel = "Logbook actions";

export function authenticatedUserSubtitle(user: User): string {
    return `${user.getDisplayName()}'s logbook`;
}
