# Routing and Policies

## Route helpers

Define every internal URL with `route` from `src/core/route-tools.ts`. A helper
generates URLs, extracts route parameters, reads query parameters, and carries
access metadata:

```ts
export const entries = {
    index: route("/entries"),
    edit: route("/entries/:entryUuid"),
    search: route("/entries/search").query<{ term?: string }>(),
};
```

Use the helper rather than interpolating internal URLs:

```ts
entries.edit({ entryUuid });
entries.search({}, { term: "example" });
entries.edit.params(c);
entries.search.query(c);
```

Routes are protected by default. Add `.public()` for an endpoint that works
without authentication. Add `.publicAsset()` only for a public asset that must
also bypass privacy-policy acceptance.

Route patterns accepted by the access-metadata matcher are `/`, static path
segments, and named parameters such as `:entryUuid`. More advanced Hono route
syntax is intentionally rejected.

## Explicit registration

Each route handler module exports `register(app)` for its own endpoints and
uses `registerRoute`:

```ts
export function register(router: AppRouter): void {
    registerRoute(router, "get", entries.index, renderIndex);
    registerRoute(router, "post", entries.index, createEntry);
}
```

The method is part of the access identity. A `GET` and `POST` can therefore
share a path while having different public/protected metadata. `HEAD` uses the
matching `GET` metadata. Conflicting access metadata for the same method and
pattern is rejected during registration.

Core handlers are collected in `src/core/register-routes.ts`; application
handlers are collected in `src/app/register-routes.ts`. Avoid side-effect
imports and raw string URLs.

## Authentication

Authentication runs before route handlers:

- Fingerprinted public assets bypass account lookup.
- A valid `session` cookie loads the user and extends activity timestamps on a
  throttled schedule.
- Protected requests may also authenticate with HTTP Basic credentials.
- Unauthenticated protected browser requests redirect to `/login` with a safe
  same-origin return path.
- If no normal account exists yet, the initial protected flow redirects to
  registration.

Sessions store a SHA-256 token hash rather than the cookie token. Cookies are
HTTP-only, `SameSite=Lax`, and secure when the request uses HTTPS. Expired
sessions are removed opportunistically.

## Privacy-policy enforcement

Hosted authenticated users must accept the privacy policy before using the
application. Until then, requests redirect to `/privacy`.

The policy does not apply to:

- self-hosted operation;
- unauthenticated requests;
- public assets and routes marked `.publicAsset()`;
- the privacy page, logout, and service-worker path; or
- users whose `privacyPolicyAccepted` option is true.

A route marked only `.public()` remains subject to privacy acceptance for an
already authenticated user. This keeps public authentication access separate
from the hosted-user policy.

## Read-only enforcement

Read-only users may use safe HTTP methods: `GET`, `HEAD`, and `OPTIONS`.
Mutation-capable methods are denied by default and redirect to `/readonly`.
Logout and privacy/account actions remain available so a read-only user can
end a session, accept the policy, or delete the account.

Do not enforce this policy independently in each product handler. Register the
route normally and let the core middleware apply it consistently.

## HTML cache placement

The per-user HTML cache is the final shared policy, after authentication,
privacy acceptance, and read-only checks. This ordering ensures cache keys and
responses reflect the resolved user and that denied requests are not cached.
See [Data, caching, and runtimes](data-caching-and-runtimes.md) for cache rules.
