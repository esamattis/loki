import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

export function wranglerBin(): string {
    const packageJson = require.resolve("wrangler/package.json");
    return join(dirname(packageJson), "bin", "wrangler.js");
}
