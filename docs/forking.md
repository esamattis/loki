# Forking The Application Core

Replacing application source requires replacing `src/app` without editing
`src/core`. A product fork must also replace the documented concrete assets and
distribution metadata; these are explicit configuration exceptions, not hidden
source dependencies.

1. Replace the contents of `src/app` with the new concrete application.
2. Create `src/app/index.tsx` with `createApp`, then call `registerCoreRoutes` and the concrete route registrar.
3. Keep the Worker and Node entrypoints importing `@/app`.
4. Replace `public/manifest.json`, the concrete service worker, branding, icons, favicon, social image, and other public content.
5. Point Drizzle at the replacement application's complete schema. Re-export the core account schema from that file.
6. Before deploying the fork, delete the inherited Loki migrations and generate a fresh baseline with `pn db:generate`. Existing Loki migrations are intentionally unchanged for deployed Loki databases.
7. Replace `tests/app` and `tests/helpers/app.ts` with concrete application coverage.
8. Remove `@ai-sdk/openai`, `ai`, and `fast-xml-parser` if the replacement app does not use them.
9. Rename Loki-specific Wrangler, SQLite, executable, Docker, package, database, container, icon-generation, and build metadata values.
10. Run `pn test`.

The source boundary is checked transitively by `scripts/check-core-boundary.ts`.
It includes static imports, type imports, literal dynamic imports, and re-exports,
and rejects non-literal dynamic imports in core. The allowed root composition
entrypoints are documented in that script.

The concrete files under `public/` remain there because Vite, Node static
serving, executable asset bundling, and icon generation consume that directory
directly. No asset-copy pipeline or parallel template build is required.
