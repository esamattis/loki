import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { $ } from "zx";

const root = resolve(import.meta.dirname, "..");
const $$ = $({ cwd: root, stdio: "inherit" });

function readPackageName(packageJsonPath: string): string {
    const packageJson: unknown = JSON.parse(
        readFileSync(packageJsonPath, "utf8"),
    );
    if (
        typeof packageJson !== "object" ||
        packageJson === null ||
        !("name" in packageJson) ||
        typeof packageJson.name !== "string" ||
        packageJson.name.length === 0
    ) {
        throw new Error("package.json is missing a non-empty name");
    }
    const rawName = packageJson.name;
    const name = rawName.includes("/")
        ? rawName.slice(rawName.lastIndexOf("/") + 1)
        : rawName;
    if (name.length === 0) {
        throw new Error(`package.json name is invalid: ${rawName}`);
    }
    return name;
}

function packageName(): string {
    return readPackageName(resolve(root, "package.json"));
}

function parseArgs(argv: string[]): { missingOk: boolean } {
    let missingOk = false;
    for (const arg of argv) {
        if (arg === "--missing-ok") {
            missingOk = true;
            continue;
        }
        throw new Error(`Unknown argument: ${arg}`);
    }
    return { missingOk };
}

async function main(): Promise<void> {
    const { missingOk } = parseArgs(process.argv.slice(2));
    const name = packageName();
    const unit = `${name}.service`;
    const loadState = (
        await $`systemctl --user show ${unit} -p LoadState --value`
    ).stdout.trim();

    if (loadState === "not-found") {
        if (missingOk) {
            console.error(`User systemd unit not found (ok): ${unit}`);
            return;
        }
        console.error(`User systemd unit not found: ${unit}`);
        process.exit(1);
    }

    await $$`pnpm run build:executable`;
    await $$`systemctl --user restart ${unit}`;
}

await main();
