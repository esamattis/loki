import { $ } from "zx";

const $$ = $({ stdio: "inherit" });

async function main(): Promise<void> {
    await $$`git fetch --tags origin`;

    const tags = (await $`git tag --list`).stdout.split("\n");
    const versions = tags.flatMap((tag) => {
        const match = /^v(\d+)$/.exec(tag.trim());
        return match ? [Number(match[1])] : [];
    });
    const tag = `v${Math.max(0, ...versions) + 1}`;

    await $$`git tag ${tag}`;
    await $$`git push origin ${tag}`;
    await $$`git push origin`;
    console.log(`Created and pushed ${tag}`);
}

await main();
