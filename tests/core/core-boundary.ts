import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkCoreBoundary } from "../../scripts/core-boundary.ts";

type Fixture = {
    name: string;
    files: Record<string, string>;
    error?: RegExp;
};

const passingFixtures: Fixture[] = [
    {
        name: "root may import both owners and app may import core",
        files: {
            "src/index.tsx":
                'import "@/core/index"; import "@/app/index"; export {};',
            "src/node.ts": 'export { value } from "@/app/index";',
            "src/core/index.ts": "export const core = true;",
            "src/app/index.ts":
                'import type { Core } from "@/core/types"; export const value = true;',
            "src/core/types.ts": "export type Core = string;",
        },
    },
    {
        name: "core alias and directory index imports resolve",
        files: {
            "src/core/index.ts": 'export * from "@/core/helpers";',
            "src/core/helpers/index.ts": "export const helper = true;",
        },
    },
    {
        name: "bare external packages are ignored",
        files: {
            "src/core/index.ts":
                'import type { ZodType } from "zod"; export type T = ZodType;',
        },
    },
    {
        name: "nonliteral application dynamic imports are allowed",
        files: {
            "src/core/index.ts": "export const core = true;",
            "src/app/index.ts":
                'const path = "./feature"; export const feature = import(path);',
        },
    },
    {
        name: "application dependencies are outside scanner scope",
        files: {
            "src/core/index.ts": "export const core = true;",
            "src/app/index.ts": 'import "./application-only-module";',
        },
    },
    {
        name: "core-owned CSS and JSON assets are allowed",
        files: {
            "src/core/index.ts":
                'import "./theme.css"; import data from "./data.json"; export { data };',
            "src/core/theme.css": '@import "./tokens.css";',
            "src/core/tokens.css": ":root { color: red; }",
            "src/core/data.json": '{"ok":true}',
        },
    },
];

const failingFixtures: Fixture[] = [
    {
        name: "direct core to app import",
        files: {
            "src/core/index.ts": 'import "@/app/feature";',
            "src/app/feature.ts": "export {};",
        },
        error: /imports src\/app\/feature\.ts \(app\)/,
    },
    {
        name: "indirect core to app import",
        files: {
            "src/core/index.ts": 'import "./helper";',
            "src/core/helper.ts": 'export * from "@/app/feature";',
            "src/app/feature.ts": "export {};",
        },
        error: /src\/core\/helper\.ts imports src\/app\/feature\.ts \(app\)/,
    },
    {
        name: "core cannot bypass app through the root entrypoint",
        files: {
            "src/core/index.ts": 'import "@/index";',
            "src/index.tsx": 'export * from "@/app/index";',
            "src/app/index.ts": "export {};",
        },
        error: /imports src\/index\.tsx \(root\)/,
    },
    {
        name: "core cannot import the node composition root",
        files: {
            "src/core/index.ts": 'import "@/node";',
            "src/node.ts": "export {};",
        },
        error: /imports src\/node\.ts \(root\)/,
    },
    {
        name: "relative imports outside owned source are rejected",
        files: {
            "src/core/index.ts": 'import "../../shared";',
            "shared.ts": "export {};",
        },
        error: /imports shared\.ts \(outside\)/,
    },
    {
        name: "unowned source modules are outside",
        files: {
            "src/core/index.ts": 'import "@/shared";',
            "src/shared.ts": "export {};",
        },
        error: /imports src\/shared\.ts \(outside\)/,
    },
    {
        name: "type imports are checked",
        files: {
            "src/core/index.ts": 'import type { App } from "@/app/types";',
            "src/app/types.ts": "export type App = string;",
        },
        error: /imports src\/app\/types\.ts \(app\)/,
    },
    {
        name: "re-exports are checked",
        files: {
            "src/core/index.ts": 'export type { App } from "@/app/types";',
            "src/app/types.ts": "export type App = string;",
        },
        error: /imports src\/app\/types\.ts \(app\)/,
    },
    {
        name: "literal dynamic imports are checked",
        files: {
            "src/core/index.ts": 'export const app = import("@/app/feature");',
            "src/app/feature.ts": "export {};",
        },
        error: /imports src\/app\/feature\.ts \(app\)/,
    },
    {
        name: "TypeScript import assignments are checked",
        files: {
            "src/core/index.ts": 'import app = require("@/app/feature");',
            "src/app/feature.ts": "export {};",
        },
        error: /imports src\/app\/feature\.ts \(app\)/,
    },
    {
        name: "literal CommonJS require calls are checked",
        files: {
            "src/core/index.cjs":
                'const app = require("../app/feature.cjs"); module.exports = app;',
            "src/core/types.ts": "export type Placeholder = true;",
            "src/app/feature.cjs": "module.exports = {};",
        },
        error: /imports src\/app\/feature\.cjs \(app\)/,
    },
    {
        name: "nonliteral core dynamic imports are rejected",
        files: {
            "src/core/index.ts":
                'const path = "./feature"; export const feature = import(path);',
        },
        error: /Non-literal dynamic import in src\/core\/index\.ts/,
    },
    {
        name: "nonliteral core CommonJS require calls are rejected",
        files: {
            "src/core/index.ts":
                'const path = "./feature"; export const feature = require(path);',
        },
        error: /Non-literal require in src\/core\/index\.ts/,
    },
    {
        name: "unresolved relative imports are errors",
        files: {
            "src/core/index.ts": 'import "./missing";',
        },
        error: /Unresolved internal import "\.\/missing"/,
    },
    {
        name: "CSS imports cannot cross from core to app",
        files: {
            "src/core/index.ts": 'import "./theme.css";',
            "src/core/theme.css": '@import "../app/theme.css";',
            "src/app/theme.css": "body { color: red; }",
        },
        error: /imports src\/app\/theme\.css \(app\)/,
    },
    {
        name: "unquoted CSS URL imports cannot cross from core to app",
        files: {
            "src/core/index.ts": 'import "./theme.css";',
            "src/core/theme.css": "@import url(../app/theme.css);",
            "src/app/theme.css": "body { color: red; }",
        },
        error: /imports src\/app\/theme\.css \(app\)/,
    },
];

async function writeFixture(root: string, fixture: Fixture): Promise<void> {
    const files = {
        "tsconfig.json": JSON.stringify({
            compilerOptions: {
                module: "ESNext",
                moduleResolution: "Bundler",
                paths: { "@/*": ["./src/*"] },
                allowImportingTsExtensions: true,
                resolveJsonModule: true,
            },
        }),
        ...fixture.files,
    };
    for (const [path, content] of Object.entries(files)) {
        const destination = join(root, path);
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, content);
    }
}

async function runFixture(fixture: Fixture): Promise<void> {
    const root = await mkdtemp(join(tmpdir(), "loki-core-boundary-"));
    try {
        await writeFixture(root, fixture);
        if (!fixture.error) {
            await checkCoreBoundary(root);
            return;
        }
        await assert.rejects(
            async () => checkCoreBoundary(root),
            fixture.error,
            fixture.name,
        );
    } finally {
        await rm(root, { recursive: true });
    }
}

for (const fixture of [...passingFixtures, ...failingFixtures]) {
    await runFixture(fixture);
}
console.log(
    `Core boundary fixtures valid (${passingFixtures.length + failingFixtures.length} cases)`,
);
