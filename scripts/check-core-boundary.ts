import { resolve } from "node:path";
import { checkCoreBoundary } from "./core-boundary.ts";

const result = await checkCoreBoundary(resolve(import.meta.dirname, ".."));
console.log(`Core boundary valid (${result.coreModuleCount} modules)`);
