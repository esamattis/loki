import { execFileSync } from "node:child_process";

function currentGitRevision(): string {
    return (
        process.env.LOKI_REVISION ??
        process.env.GITHUB_SHA ??
        execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()
    );
}

export function buildInfoDefine(version = ""): Record<string, string> {
    return {
        __LOKI_REVISION__: JSON.stringify(currentGitRevision()),
        __LOKI_VERSION__: JSON.stringify(version),
    };
}
