import { execFileSync } from "node:child_process";

function currentGitRevision(): string {
    return (
        process.env.APP_REVISION ??
        process.env.GITHUB_SHA ??
        execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()
    );
}

export function buildInfoDefine(version = ""): Record<string, string> {
    return {
        __APP_REVISION__: JSON.stringify(currentGitRevision()),
        __APP_VERSION__: JSON.stringify(version),
    };
}
