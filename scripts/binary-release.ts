import { $ } from "zx";

async function main(): Promise<void> {
    await $({ stdio: "inherit" })`git fetch --tags origin`;

    const tags = (await $`git tag --list`).stdout.split("\n");
    const versions = tags.flatMap((tag) => {
        const match = /^v(\d+)$/.exec(tag.trim());
        return match ? [Number(match[1])] : [];
    });
    const tag = `v${Math.max(0, ...versions) + 1}`;

    await $({ stdio: "inherit" })`git tag ${tag}`;
    await $({ stdio: "inherit" })`git push origin ${tag}`;
    console.log(`Created and pushed ${tag}`);
}

await main();
