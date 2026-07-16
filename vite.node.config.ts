import { defineConfig, type PluginOption } from "vite";
import ssrPlugin from "vite-ssr-components/plugin";
import tailwindcss from "@tailwindcss/vite";
import { buildInfoDefine } from "./vite.build-info";

const serverPlugins = ssrPlugin().filter(
    (plugin) => plugin.name === "inject-manifest",
);

export default defineConfig({
    resolve: {
        alias: {
            "@": new URL("./src", import.meta.url).pathname,
        },
    },
    build: {
        ssr: "src/node.ts",
        outDir: "dist-server",
        emptyOutDir: true,
        target: "node22",
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
            },
        },
    },
    ssr: {
        noExternal: true,
    },
    define: {
        ...buildInfoDefine(process.env.LOKI_VERSION),
        "process.env.PLAYWRIGHT_TEST": JSON.stringify(""),
    },
    plugins: [...serverPlugins, tailwindcss()] satisfies PluginOption[],
});
