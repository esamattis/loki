# Data, Caching, and Runtimes

## Database abstraction

Core exposes a D1-shaped Drizzle client as `AppDatabase`. Product handlers use
the request-scoped client from `RequestContext.db`, which keeps query code shared
between runtimes.

On Cloudflare, `createD1Database` wraps the D1 binding and records SQL timing.
On Node, `createSqliteDatabase` opens `node:sqlite`, enables WAL and foreign
keys, applies restrictive filesystem permissions where supported, and adds a
D1-compatible transactional `batch` implementation.

The concrete application owns the complete Drizzle schema. It re-exports
`users`, `sessions`, and `invitations` from `@/core/schema` and declares its
product tables beside them. This complete schema is the input to migration
generation.

## SQLite storage and migrations

The Node runtime resolves a platform-appropriate application data directory,
unless `SQLITE_PATH` or the CLI `--sqlite-dir` option overrides it. It applies
pending Drizzle migrations before serving requests.

The self-contained executable embeds migrations. At startup core extracts them
to a temporary directory, applies only pending migrations, and removes the
temporary files. Normal Node builds read migrations from `drizzle/`.

Migration history belongs to the concrete application. A new fork generates a
new baseline, while an existing product preserves its published migration
history.

## Per-user HTML caching

On runtimes with the Cache API, core caches eligible authenticated `GET` HTML
responses. Keys include:

- build revision;
- user UUID;
- the user's cache generation;
- administrator role; and
- the complete requested URL.

This prevents responses from crossing users, roles, deployments, or
application states. Normal entries use a five-minute cache TTL; read-only users
use a one-day TTL.

The cache bypasses unauthenticated requests, non-`GET` methods, development
outside Playwright, preferences, admin pages, non-HTML responses, responses
that set cookies, and responses marked `no-store`. Users may disable it with
their `htmlCacheEnabled` option.

Every authenticated `POST` by a non-read-only user increments that user's
cache generation in a `finally` block. Old entries become unreachable without
requiring a broad cache deletion. Responses sent to browsers remain
`private, no-store`.

`X-Loki-HTML-Cache` reports `HIT`, `MISS`, `DISABLED`, or `BYPASS`.

## Timing diagnostics

The request context counts SQL queries, total SQL time, longest SQL query time,
and total page time. Both D1 and Node SQLite adapters feed these counters.
Responses expose:

- `Server-Timing` for SQL, longest SQL, and page durations; and
- `X-Loki-SQL-Queries` for the query count.

Cached responses omit origin timing headers because those measurements do not
describe the cache hit.

## Built assets and rendering support

Core fingerprints its Tailwind stylesheet and HTMX module with SHA-256 and
registers immutable asset URLs containing those fingerprints. The renderer
links to those URLs, so a content change naturally produces a new cache key.

The concrete application owns product assets in `public/`, including the
manifest, icons, logo, and social image. It also owns the service-worker route
because fetch behavior may depend on product routes; core supplies
registration UI and the install/activate lifecycle helper.

## Deployment modes

The same `AppRouter` runs in:

- Cloudflare Workers with D1;
- Node through `@hono/node-server` and SQLite; and
- a Node single executable application with embedded client assets and
  migrations.

`src/index.tsx` is the Worker entry point. `src/node.ts` composes the Node
server, static asset serving, CLI options, database startup, and optional
browser launch. Core's SEA asset helper serves embedded client files when the
process is a self-contained executable.

Build metadata helpers expose the revision, optional release version, commit
URL, release URL, and display title without importing the concrete
application. The application supplies its repository URL and build name.
