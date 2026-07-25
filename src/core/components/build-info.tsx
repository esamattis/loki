import {
    commitUrl,
    releaseUrl,
    shortGitRevision,
    version,
} from "@/core/build-info";
import { ExternalLink } from "@/core/components/link";
import { useAppContext } from "@/core/create-app";

export function BuildInfo() {
    return (
        <>
            <span>{useAppContext().appOptions.name}</span>
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
