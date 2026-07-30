# Forking the Application Core

A fork replaces the concrete product without editing `src/core`. Follow this
procedure to replace the application while preserving the boundary between the
reusable core and concrete product.

## Replacement procedure

1. Replace all of `src/app`. The replacement must provide:
    - `src/app/index.tsx`, exporting the configured `app`;
    - `src/app/schema.ts`, exporting the complete Drizzle schema and
      re-exporting `users`, `sessions`, and `invitations` from `@/core/schema`;
    - `src/app/config.ts`, exporting the `appConfig` contract shown below; and
    - its route helpers and handlers. Call `registerCoreRoutes(app)` once, then
      attach each concrete handler with `registerRoute`. A route marked
      `.public()` becomes public when that handler is registered; there is no
      second public-route list.
2. Replace the product-owned files under `public/`.
3. Replace the concrete tests and fixtures listed below.
4. Remove everything inside `drizzle/` (removing the directory itself is also
   supported), then run `pn db:generate`. This creates the directory if needed
   and generates the new product's baseline. Do this only for a new fork:
   Loki's existing migration history remains unchanged for existing Loki
   installations.
5. Update the distribution and deployment files in the mapping below.
6. Remove app-only dependencies such as `@ai-sdk/openai`, `ai`, and
   `fast-xml-parser` if the replacement does not use them.
7. Run `pn test`.

`src/app/config.ts` is the application-to-repository-script contract:

```ts
export const appConfig = {
    buildName: "Example",
    defaultUserOptionsJson: JSON.stringify(CoreUserOptionsSchema.parse({})),
    executableName: process.platform === "win32" ? "example.exe" : "example",
    sqliteFilename: "example.sqlite",
    storageDirectoryName(platform: NodeJS.Platform = process.platform) {
        return platform === "win32" ? "Example" : "example";
    },
} as const;
```

The default options must be valid JSON for the complete concrete option schema.
Repository scripts consume this contract; they do not import an app's internal
`options.ts`.

## Exact fork-owned file mapping

| Concern                                                                                                                   | File or exported value to replace                                                               |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Request-time name, title, repository URL, navigation, authenticated subtitle, privacy content, registration hooks, routes | `src/app/index.tsx`                                                                             |
| Build name, executable filename, default user options, SQLite filename and application data directory                     | `src/app/config.ts` (`appConfig`)                                                               |
| Complete account and application schema                                                                                   | `src/app/schema.ts`                                                                             |
| Concrete routes and registration                                                                                          | `src/app/routes.ts`, `src/app/register-routes.ts`, and concrete handler modules                 |
| Browser manifest, service worker, icons, favicon, logo, social image and other static product files                       | `public/`                                                                                       |
| npm package identity and remote D1 backup database name                                                                   | `package.json`                                                                                  |
| Cloudflare Worker name, routes and D1 binding/database identity                                                           | `wrangler.jsonc`                                                                                |
| Drizzle schema/output convention                                                                                          | `drizzle.shared.config.ts` (keep `src/app/schema.ts` unless deliberately changing the contract) |
| Migration history                                                                                                         | contents of `drizzle/` for a new fork only                                                      |
| Node CLI composition and startup behavior                                                                                 | `src/node.ts` (normally no edit is needed when `appConfig` is sufficient)                       |
| SEA executable construction                                                                                               | `scripts/build-executable.ts` and `src/app/config.ts#appConfig.executableName`                  |
| Release asset naming and repository release URLs                                                                          | `scripts/binary-release.ts`, `.github/workflows/binary-release.yml`                             |
| Generated icon artwork and text                                                                                           | `scripts/generate-icons.ts`                                                                     |
| Container repository, binary/user names, storage directory and service/volume names                                       | `docker/Dockerfile`, `docker/docker-compose.yml`                                                |
| Package icons and release/deployment automation                                                                           | `.github/workflows/binary-release.yml` and any fork-added deployment workflows                  |

The public folder is intentionally concrete because Vite, Node static serving,
the executable asset bundle, and icon generation consume it directly.

## Concrete Loki tests to replace

Reusable infrastructure tests may remain in place. The following tests contain
Loki routes, options, policy, logbook behavior, product assets, or bootstrap
hooks and are the exact concrete test surface:

```text
tests/about.spec.ts
tests/asset-caching.spec.ts
tests/csv.spec.ts
tests/demo.spec.ts
tests/example-logbook.spec.ts
tests/gap-toggle.spec.ts
tests/home.spec.ts
tests/jump-aircraft.spec.ts
tests/jump-archived-edit.spec.ts
tests/jump-card.spec.ts
tests/jump-delete.spec.ts
tests/jump-from-image.spec.ts
tests/jump-item-archive-edit.spec.ts
tests/jump-item-delete.spec.ts
tests/jump-item-merge.spec.ts
tests/jump-number-gaps.spec.ts
tests/jump-number-validation.spec.ts
tests/jump-prefill.spec.ts
tests/logbook/duplicate-jump-number.spec.ts
tests/logbook-offset.spec.ts
tests/logbook-sort.spec.ts
tests/logbook-transfer.spec.ts
tests/logbook.spec.ts
tests/mobile-nav.spec.ts
tests/preferences.spec.ts
tests/privacy.spec.ts
tests/register-bootstrap.setup.ts
tests/register.spec.ts
tests/repository-paths.spec.ts
tests/skydiving-logbook-xml.spec.ts
tests/speed-units.spec.ts
tests/sqlite-defaults.spec.ts
tests/helpers/app.ts
tests/fixtures/jump-image.png
tests/fixtures/logbook-round-trip.csv
tests/fixtures/logbook.csv
tests/fixtures/skydiving-logbook-cutaway-no-type.xml
tests/fixtures/skydiving-logbook-cutaway-type.xml
tests/fixtures/skydiving-logbook.xml
```

The remaining tests cover reusable account, admin, cache, formatting,
route-registration, SSR component, form, and browser infrastructure. A fork may
of course add its own organization, but this repository does not claim a
nonexistent `tests/app` directory.

## Boundary and route rules

The source boundary has four owners: `core` (`src/core`), `app` (`src/app`),
`root` (`src/index.tsx` and `src/node.ts`), and `outside` (all other files).
Root composition may import core and app, and app may import core. Core may
traverse only core-owned dependencies, so direct or indirect imports from core
to app, root, or outside fail.

The boundary is checked transitively by `scripts/check-core-boundary.ts`, with
fixture coverage in `tests/core-boundary.ts`. It uses TypeScript module
resolution with the repository compiler options for JavaScript and TypeScript,
including aliases and directory indexes. It resolves literal CSS, JSON, HTML,
SVG, and text assets and traverses local CSS `@import` dependencies. Query
suffixes do not affect ownership. Unresolved relative or configured-path
imports are errors; bare packages are ignored.

Static imports, type imports, re-exports, and literal dynamic imports all
participate in the graph. Non-literal dynamic imports are rejected in core but
allowed in app and root composition code.

## Stable browser protocol names

The `data-loki-*` attributes are intentionally retained as stable internal
browser protocol names. Core and concrete components, embedded scripts, tests,
and persisted browser state already coordinate through these names. They are
not displayed product identity. A future protocol migration may rename them as
a separate compatibility change; forks do not need to rename them.
