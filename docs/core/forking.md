# Forking the Application Core

A fork replaces the concrete product while preserving the reusable core. The
architectural dependency remains one-way:

```text
src/app  --imports and configures-->  src/core
src/core --must never import-------->  src/app
```

Do not delete all of `src/`: it also contains the reusable core and runtime
entry points.

## Before cleaning

Work from the repository root and preserve anything that must be carried into
the new product. The cleanup commands below permanently remove tracked product
source, static assets, migration history, concrete tests, local databases,
generated output, test state, local environment files, and backups.

Deleting migration history is appropriate only for a new product with a new
database. Do not do it when maintaining or upgrading an existing deployment.

Remote Cloudflare data, globally stored Wrangler credentials, Docker volumes,
and platform-specific SQLite data outside the repository are not removed by
these commands. Inspect and remove those separately only after verifying the
account, volume, or path.

## Initial cleanup

Confirm the working directory before running destructive commands:

```sh
pwd
```

Remove the existing product source, static assets, migration history, and
concrete tests, then recreate their top-level directories for the replacement:

```sh
rm -rf -- src/app public drizzle tests/app tests-executable
mkdir -p src/app public tests/app tests-executable
```

The reusable test suite remains under `tests/core`.

Remove repository-local database state, build output, test output, backups,
logs, and other generated state:

```sh
rm -rf -- \
  .wrangler \
  .playwright \
  dist \
  dist-server \
  dist-executable \
  playwright-report \
  test-results \
  blob-report \
  backups \
  data \
  logs
```

Remove local secrets if they must not carry into the fork:

```sh
rm -f -- .env .env.production .dev.vars
```

For a completely fresh dependency installation, also remove installed
packages. Keep the lockfile and update it through pnpm rather than deleting it.

```sh
rm -rf -- node_modules
pn install
```

## Replace the product

1. Implement the replacement under `src/app`. It remains the concrete
   composition root: create and configure the core router, register core routes
   once, and then register the concrete routes explicitly. Route modules must
   not register themselves through import side effects.
2. Add the replacement static assets under `public`.
3. Ensure the complete Drizzle schema includes the reusable account tables and
   add the replacement product's tables.
4. Provide the repository-script configuration values for the build name,
   executable name, default complete user options, SQLite filename, and
   platform storage directory. The default options must be valid JSON for the
   replacement's complete option schema.
5. Replace product-dependent tests and fixtures while retaining verified core
   infrastructure coverage.
6. Remove dependencies the replacement does not use and add its required
   dependencies with pnpm so the lockfile remains synchronized.

Use the other core guides for the current router, schema, request-context,
policy, SSR, and runtime contracts. TypeScript and the boundary check provide
the authoritative validation when those contracts evolve.

## Audit repository integration

Product identity and behavior also appear outside `src/app`. Review these
stable integration surfaces instead of relying on a file-by-file product list,
which becomes stale as the application changes:

- package metadata, scripts, lockfile, project README, installer, and license
  notices;
- Worker, D1, Drizzle, generated binding, Vite, and Playwright configuration;
- remote backup, import, release, executable, and icon-generation scripts;
- static assets, migration history, tests, fixtures, and product documentation;
- Docker definitions, service and volume names, and release or deployment
  workflows;
- repository URLs, download URLs, executable and archive names, domains,
  product names, user-facing copy, and contributor instructions.

Search for the old identity across the repository after replacement. Substitute
the old fork's actual values in this command:

```sh
rg -n -i \
  '<old product name>|<old package name>|<old repository owner>|<old worker name>|<old database name>|<old database id>|<old domain>' \
  --glob '!node_modules/**' \
  --glob '!pnpm-lock.yaml' \
  --glob '!src/core/**' \
  --glob '!docs/core/**'
```

Review excluded core matches separately rather than replacing them globally.
Some old-product-prefixed browser attributes, storage keys, and cache headers
are stable internal protocols, not displayed branding. Rename them only as a
deliberate compatibility migration.

## Reset deployment identity

Remove every old remote database name and ID. The Worker configuration, remote
Drizzle configuration, backup scripts, and deploy scripts can each contain
deployment identity. Clearing only the Worker configuration is not sufficient.

Also remove the old Worker name and routes. Leave remote deployment and
database commands unusable until the new product is deliberately configured to
target its own resources. Separately replace repository and release URLs,
package and binary names, container identity, and generated Cloudflare
bindings.

Do not run `pn deploy`, `pn db:migrate:remote`, `pn db:export:remote`, or
`pn db:import:remote` until this audit is complete. These commands can read,
overwrite, or deploy against the original project's remote resources. Remote
import is destructive because it replaces database tables.

## Rebuild local state

After the replacement source, configuration, and assets are in place:

```sh
mise install
pn install
pn db:generate
pn cf-typegen
pn db:migrate
pn test
```

`pn db:generate` creates `drizzle/` and generates the new baseline migration.
`pn db:migrate` recreates local D1 state under `.wrangler/`. The test suite
formats the repository, checks the core boundary and types, and exercises the
browser and executable runtimes.

Before publishing, also build and run every distribution form the fork keeps,
such as the Worker, Node server, executable, installer, and container. Remove
unused distribution paths rather than leaving them configured for the old
product.

## Preserve reusable infrastructure

Core must not directly or indirectly import application, root, or outside
modules. The boundary check follows static imports, type imports, re-exports,
literal dynamic imports, configured aliases, directory indexes, and supported
local assets. Non-literal dynamic imports are rejected in core.

Keep dependency patches and their `PATCHES.md` documentation while the patched
dependency remains in use. Preserve applicable license and copyright notices;
rebranding a fork does not remove the original license obligations.
