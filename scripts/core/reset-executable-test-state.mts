import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const directory = resolve(".playwright/executable");
rmSync(directory, { recursive: true, force: true });
mkdirSync(directory, { recursive: true });
