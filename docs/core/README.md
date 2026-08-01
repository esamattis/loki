# Core Feature Guide

`src/core` is the reusable application layer beneath Loki. It provides the
Hono application shell, request context, route access metadata, accounts,
policies, SSR components, browser helpers, persistence adapters, caching, and
runtime support. `src/app` supplies the concrete product behavior and is the
composition root.

The architectural rule is one-way:

```text
src/app  ──imports and configures──>  src/core
src/core ──must never import────────>  src/app
```

The boundary is checked transitively by `scripts/check-core-boundary.ts` as part
of the test suite. When core needs product-specific behavior, add the smallest
direct option or callback to the core API and provide it from
`src/app/index.tsx`. Do not introduce a feature registry or dependency lookup
that lets core reach back into the application.

## Feature documentation

- [Composition and request context](composition-and-context.md) explains
  `createAppRouter`, the application options contract, middleware setup, and access
  to request-scoped services.
- [Routing and policies](routing-and-policies.md) covers typed route helpers,
  route registration, public access metadata, authentication enforcement,
  privacy acceptance, and read-only users.
- [Accounts and preferences](accounts-and-preferences.md) describes users,
  sessions, registration hooks, invitations, administration, preferences, and
  account deletion.
- [SSR UI and browser behavior](ssr-ui-and-browser-behavior.md) documents the
  page shell, shared components, Tailwind styling, safe inline scripts, forms,
  HTMX fragments, and return navigation.
- [Data, caching, and runtimes](data-caching-and-runtimes.md) explains the core
  schema, D1 and SQLite adapters, migrations, per-user HTML caching, server
  timing, assets, and executable support.

For replacing Loki with another concrete product, see
[Forking the application core](forking.md). That guide covers cleanup,
replacement, repository integration, and deployment reset procedures.

## Composition at a glance

A concrete application normally performs three steps:

```tsx
export const appRouter = createAppRouter({
    // Product metadata, one renderer, and lifecycle hooks.
});

registerCoreRoutes(app);
registerAppRoutes(app);
```

`createAppRouter` installs cross-cutting middleware and delegates full-document
rendering to the configured renderer. The concrete renderer normally wraps
`CoreLayout` in `AppShell` and supplies its product-specific UI to the layout.
`registerCoreRoutes` adds the reusable account, privacy, preferences, asset, and
admin endpoints. The concrete route registrar adds product pages and handlers.
Every handler is registered explicitly; route modules do not register
themselves as an import side effect.

## What belongs where

| Put in `src/core`                               | Put in `src/app`                                   |
| ----------------------------------------------- | -------------------------------------------------- |
| Infrastructure useful to another product        | Product-specific routes and workflows              |
| Generic account, policy, form, or UI behavior   | Product navigation, wording, and page content      |
| Runtime adapters and request-scoped services    | The complete product schema and option schema      |
| Direct configuration inputs and lifecycle hooks | Implementations passed into those inputs and hooks |

Core is internal reusable source, not a separately versioned package. Imports
use the `@/core/...` alias and may target the focused module that owns a
feature.
