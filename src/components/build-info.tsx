import { commitUrl, releaseUrl, shortGitRevision, version } from "@/build-info";
import { ExternalLink } from "@/components/link";

export function BuildInfo() {
    return (
        <>
            <span>Loki</span>
            {version && releaseUrl && (
                <>
                    {" "}
                    <ExternalLink href={releaseUrl}>{version}</ExternalLink>
                </>
            )}{" "}
            (
            <ExternalLink
                href={commitUrl}
                data-loki-tooltip="View commit on GitHub this version was built from"
            >
                {shortGitRevision}
            </ExternalLink>
            )
        </>
    );
}
