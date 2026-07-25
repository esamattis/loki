import { cloudflare } from "@cloudflare/vite-plugin";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type PluginOption } from "vite";
import ssrPlugin from "vite-ssr-components/plugin";
import tailwindcss from "@tailwindcss/vite";
import { buildInfoDefine } from "./vite.build-info";

export default defineConfig({
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    build: {
        emptyOutDir: false,
        ssr: "src/index.tsx",
        target: "esnext",
    },
    define: {
        ...buildInfoDefine(),
        "process.env.PLAYWRIGHT_TEST": JSON.stringify(
            process.env.PLAYWRIGHT_TEST ?? "",
        ),
    },
    plugins: [
        cloudflare({
            persistState: {
                path: process.env.PLAYWRIGHT_TEST
                    ? ".playwright/state"
                    : ".wrangler/state",
            },
        }),
        ssrPlugin(),
        tailwindcss(),
    ] satisfies PluginOption[],
});
