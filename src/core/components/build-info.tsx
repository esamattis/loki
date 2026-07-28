import {
    commitUrl,
    releaseUrl,
    shortGitRevision,
    version,
} from "@/core/build-info";
import { ExternalLink } from "@/core/components/link";
import { useRequestContext } from "@/core/create-app";

/**
 * Inline build identity: app name, optional release version link, and short
 * git revision linking to the commit on GitHub.
 */
export function BuildInfo() {
    const appOptions = useRequestContext().appOptions;
    const appReleaseUrl = releaseUrl(appOptions.repositoryUrl);
    return (
        <>
            <span>{appOptions.name}</span>
            {version && appReleaseUrl && (
                <>
                    {" "}
                    <ExternalLink href={appReleaseUrl}>{version}</ExternalLink>
                </>
            )}{" "}
            (
            <ExternalLink
                href={commitUrl(appOptions.repositoryUrl)}
                data-loki-tooltip="View commit on GitHub this version was built from"
            >
                {shortGitRevision}
            </ExternalLink>
            )
        </>
    );
}
