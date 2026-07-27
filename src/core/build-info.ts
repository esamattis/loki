declare const __APP_REVISION__: string;
declare const __APP_VERSION__: string;

/** Full git revision injected at build time. */
export const gitRevision = __APP_REVISION__;
/** First 10 characters of {@link gitRevision}. */
export const shortGitRevision = gitRevision.slice(0, 10);
/** Release version string when set at build time; otherwise `null`. */
export const version = __APP_VERSION__ || null;

/**
 * GitHub commit URL for the build revision.
 *
 * @param repositoryUrl - Base repository URL (no trailing slash).
 */
export function commitUrl(repositoryUrl: string): string {
    return `${repositoryUrl}/commit/${gitRevision}`;
}

/**
 * GitHub release URL for the build version, or `null` when unversioned.
 *
 * @param repositoryUrl - Base repository URL (no trailing slash).
 */
export function releaseUrl(repositoryUrl: string): string | null {
    return version ? `${repositoryUrl}/releases/tag/${version}` : null;
}

/**
 * Human-readable build label: name, optional version, and short revision.
 *
 * @param buildName - Application display name.
 */
export function buildTitle(buildName: string): string {
    return `${buildName}${version ? ` ${version}` : ""} (${shortGitRevision})`;
}
