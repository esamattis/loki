declare const __LOKI_REVISION__: string;
declare const __LOKI_VERSION__: string;

const repositoryUrl = "https://github.com/esamattis/loki";

export const gitRevision = __LOKI_REVISION__;
export const shortGitRevision = gitRevision.slice(0, 10);
export const version = __LOKI_VERSION__ || null;
export const commitUrl = `${repositoryUrl}/commit/${gitRevision}`;
export const releaseUrl = version
    ? `${repositoryUrl}/releases/tag/${version}`
    : null;
export const buildTitle = `Loki${version ? ` ${version}` : ""} (${shortGitRevision})`;
