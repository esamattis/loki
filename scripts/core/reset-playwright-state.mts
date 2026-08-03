import { rm } from "node:fs/promises";

async function main(): Promise<void> {
    await rm(".playwright/state", { recursive: true, force: true });
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
