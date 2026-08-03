import { chmod, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { $ } from "zx";

const root = resolve(import.meta.dirname, "../..");
const $$ = $({ cwd: root, quiet: true });
const hook = `#!/bin/sh

root=$(git rev-parse --show-toplevel) || exit 0
cd "$root" || exit 0

mise exec -- node scripts/core/systemd-restart.mts
restart_status=$?

if [ "$restart_status" -ne 0 ]; then
    printf '%s\\n' "Saldo restart failed during pre-push hook (exit $restart_status); allowing push." >&2
fi

exit 0
`;

async function hooksDirectory(): Promise<string> {
    const path = (await $$`git rev-parse --git-path hooks`).stdout.trim();
    return resolve(root, path);
}

async function main(): Promise<void> {
    const directory = await hooksDirectory();
    const path = resolve(directory, "pre-push");
    await mkdir(directory, { recursive: true });
    await writeFile(path, hook);
    await chmod(path, 0o755);
    console.info(`Installed non-blocking systemd restart hook: ${path}`);
}

await main();
