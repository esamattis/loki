import { defineConfig, type PluginOption } from "vite";
import ssrPlugin from "vite-ssr-components/plugin";
import tailwindcss from "@tailwindcss/vite";
import { builtinModules } from "node:module";

const nodeBuiltins = builtinModules.flatMap((name) => [name, `node:${name}`]);

export default defineConfig({
    build: {
        ssr: "src/node.ts",
        outDir: "dist-server",
        emptyOutDir: true,
        target: "node22",
        rollupOptions: {
            external: [
                ...nodeBuiltins,
                "better-sqlite3",
                "@hono/node-server",
                "@hono/node-server/serve-static",
            ],
        },
    },
    ssr: {
        noExternal: true,
        external: [
            "better-sqlite3",
            "@hono/node-server",
            "@hono/node-server/serve-static",
        ],
    },
    define: {
        "process.env.PLAYWRIGHT_TEST": JSON.stringify(""),
    },
    plugins: [ssrPlugin(), tailwindcss()] satisfies PluginOption[],
});
