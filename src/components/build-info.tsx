import { commitUrl, releaseUrl, shortGitRevision, version } from "@/build-info";

const linkClassName =
    "hover:text-indigo-600 hover:underline dark:hover:text-indigo-400";

export function BuildInfo() {
    return (
        <>
            <span>Loki</span>
            {version && releaseUrl && (
                <>
                    {" "}
                    <a href={releaseUrl} className={linkClassName}>
                        {version}
                    </a>
                </>
            )}{" "}
            (
            <a
                href={commitUrl}
                className={linkClassName}
                data-tooltip="View commit on GitHub this version was built from"
            >
                {shortGitRevision}
            </a>
            )
        </>
    );
}
