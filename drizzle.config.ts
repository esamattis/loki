import { defineConfig } from "drizzle-kit";
import {
    drizzleOutputPath,
    drizzleSchemaPath,
} from "./drizzle.shared.config.ts";

export default defineConfig({
    dialect: "sqlite",
    schema: drizzleSchemaPath,
    out: drizzleOutputPath,
});
