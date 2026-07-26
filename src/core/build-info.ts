declare const __APP_REVISION__: string;
declare const __APP_VERSION__: string;

export const gitRevision = __APP_REVISION__;
export const shortGitRevision = gitRevision.slice(0, 10);
export const version = __APP_VERSION__ || null;

export function commitUrl(repositoryUrl: string): string {
    return `${repositoryUrl}/commit/${gitRevision}`;
}

export function releaseUrl(repositoryUrl: string): string | null {
    return version ? `${repositoryUrl}/releases/tag/${version}` : null;
}

export function buildTitle(buildName: string): string {
    return `${buildName}${version ? ` ${version}` : ""} (${shortGitRevision})`;
}
