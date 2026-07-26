import {
    commitUrl,
    releaseUrl,
    shortGitRevision,
    version,
} from "@/core/build-info";
import { ExternalLink } from "@/core/components/link";
import { useAppContext } from "@/core/create-app";

export function BuildInfo() {
    const appOptions = useAppContext().appOptions;
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
