import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { $ } from "zx";

const root = resolve(import.meta.dirname, "../..");
const $$ = $({ cwd: root, stdio: "inherit" });

async function readPackageName(packageJsonPath: string): Promise<string> {
    const packageJson: unknown = JSON.parse(
        await readFile(packageJsonPath, "utf8"),
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

async function packageName(): Promise<string> {
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
    const name = await packageName();
    const unit = `${name}.service`;
    console.info(`Checking user systemd unit: ${unit}`);
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

    console.info("Building binary before restarting service");
    await $$`pnpm run build:binary`;
    console.info(`Restarting user systemd unit: ${unit}`);
    await $$`systemctl --user restart ${unit}`;
    console.info(`Restarted user systemd unit: ${unit}`);
}

await main();
