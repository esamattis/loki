# Core Migration Review Remediation Plan

## Goal

Resolve the correctness, security, and maintainability findings from the
`separate-reusable-core` review while preserving the boundary that core never
imports the concrete application.

## Principles

- Fix current Loki regressions before generalizing the reusable core further.
- Keep authentication, privacy acceptance, and read-only authorization as
  separate policies.
- Use Hono's routing behavior as the source of truth instead of maintaining a
  second router.
- Keep destructive actions in dedicated forms.
- Remove unused abstractions instead of finding artificial consumers for them.
- Add behavioral tests for each regression; avoid presentation-only assertions.

## Phase 1: Security and authorization

### 1. Mask the stored OpenAI API key

- Change the OpenAI API key control in `src/app/preferences.tsx` back to the
  password-style component used before the extraction.
- Preserve the existing submitted-value behavior when validation fails.
- Add a preferences test asserting that the stored key is rendered in a
  password input and remains editable.

### 2. Make read-only enforcement method-safe

- Change `src/core/middleware/policies.ts` to allow safe request methods and
  reject mutation methods by default, rather than checking only `POST`.
- Keep narrowly documented exceptions for operations read-only users must be
  able to perform, such as logout and privacy-policy actions.
- Decide explicitly whether the Loki demo action remains an allowed exception.
  Preserve the `origin/main` behavior unless product requirements have changed.
- Add policy coverage for `POST`, `PUT`, `PATCH`, and `DELETE`, plus safe
  `GET`, `HEAD`, and `OPTIONS` requests.

### 3. Separate public authentication access from privacy acceptance

- Remove the general `isRegisteredPublicPath()` exemption from
  `privacyPolicyMiddleware`.
- Retain only the explicit privacy-policy allowlist, public assets,
  unauthenticated access, and self-hosted behavior.
- Add tests showing that:
    - unauthenticated users can access public pages;
    - authenticated users who have not accepted the policy are redirected from
      public application pages;
    - the privacy, logout, service-worker, and asset paths remain available.

## Phase 2: Restore navigation and preferences behavior

### 4. Make mobile account controls independent of application navigation

- Update `src/core/app-page.tsx` so `MainMenu` is always reachable on mobile,
  even when `CreateAppOptions.navigation` is omitted.
- Do not render empty navigation chrome when an application has no navigation.
- Keep desktop and mobile access to Preferences, Logout, and Admin consistent.
- Extend the fork smoke test or fixture coverage to exercise mobile-independent
  account navigation without configuring an application navigation callback.

### 5. Isolate destructive logbook deletion

- Move “Delete logbook data” out of the saveable logbook-preferences form into
  its own confirmation-gated form.
- Do not add `data-loki-confirm` or `RedirectBackAfterPost` to the destructive
  form.
- Preserve the intentional post-deletion redirect to the logbook.
- Restore a stable `danger-zone` anchor on the destructive section so
  `/preferences#danger-zone` works again.
- Add behavioral coverage for deletion, return navigation, and the deep link.

## Phase 3: Simplify route access metadata

### 6. Replace or constrain the custom public-route matcher

The current implementation in `src/core/register-route.ts` duplicates Hono
matching and cannot represent different access policies for different methods
on the same path.

- Design route access metadata around both method and route.
- Prefer attaching authorization behavior during route registration or using
  Hono's own matched-route information.
- Avoid independently implementing Hono's parameter grammar and specificity
  rules.
- If a custom matcher remains unavoidable:
    - define and validate a deliberately restricted route grammar;
    - reject unsupported Hono route patterns at registration time;
    - include the HTTP method in matcher identity and lookup;
    - test static/parameter overlaps and all supported methods.
- Add a test for a public `GET` and protected `POST` sharing the same path.

## Phase 4: Strengthen and simplify boundary validation

### 7. Close import-scanner gaps

- Teach `scripts/core-boundary.ts` to detect:
    - TypeScript import assignments;
    - literal CommonJS `require()` calls in supported JavaScript and TypeScript
      files;
    - unquoted CSS imports such as `@import url(../app/theme.css)`.
- Reject non-literal core `require()` calls consistently with non-literal
  dynamic imports, or document why they are unsupported.
- Add a failing fixture for every newly supported syntax.

### 8. Remove redundant graph traversal

- Parse dependencies only for files needed to enforce the boundary.
- Check every immediate dependency of every core module. Because all core
  modules are checked, an additional transitive traversal from every starting
  module does not strengthen the invariant.
- Preserve diagnostics that identify the importing core file and forbidden
  dependency.

## Phase 5: Remove dead and misleading abstractions

### 9. Remove the unused request cache

- Delete `CachedFunction` and `cached()` from `src/core/create-app.tsx`.
- Do not add a consumer: the helper was already unused on `origin/main`, its
  `_key` argument has no effect, and no current request loader needs
  memoization.
- Introduce request-local caching later only at a demonstrated repeated-work
  call site.

### 10. Remove trivial compatibility and forwarding helpers

- Remove `User.updateOptions()` if repository-wide search confirms it still has
  no consumers; retain the explicit core/app option update APIs.
- Inline `readFileNames()` in `scripts/fork-smoke.ts`.
- Collapse `createRenderer()` and `registerRenderer()` if no separate renderer
  construction is needed by tests or alternate composition roots.
- Deduplicate `isPublicAssetPath()` between authentication and policy
  middleware.

### 11. Consolidate application identity configuration

- Make `src/app/config.ts` the single non-request-time contract for build,
  executable, database, and storage identity.
- Remove duplicated values from `src/app/identity.ts` and
  `src/app/metadata.ts`, or narrow those modules to derived request-time
  presentation values.
- Remove the unused `CreateAppOptions.buildName` field unless core begins using
  it as the single build-display source.
- Update scripts to consume the documented `appConfig` contract.

## Phase 6: Fork-smoke robustness

### 12. Correct fixture copying

- Make nested fixture directories copy recursively, including directories that
  do not end in `.fixture`.
- Rename only fixture files, not directories.
- Add a nested fixture to prove the behavior.

### 13. Make executable startup deterministic

- Allocate an available port instead of hard-coding port `8797`.
- Drain or capture child stdout and stderr.
- Include captured process output in startup-failure diagnostics.
- Retain guaranteed process termination and temporary-directory cleanup.

## Verification

After each implementation change, run:

```text
pn test
```

Before considering the remediation complete, also verify:

- the fork smoke test exercises an application with no custom navigation;
- public GET/protected POST route sharing is covered;
- read-only mutation coverage includes every supported unsafe method;
- privacy acceptance remains enforced on authenticated public pages;
- the API key is masked;
- destructive logbook deletion has no unsaved-change or return-route coupling;
- all boundary-bypass fixtures fail for the expected reason;
- repository search finds no remaining `cached()` or obsolete forwarding
  helpers.

## Suggested implementation order

1. API-key masking and preferences destructive-form separation.
2. Read-only and privacy-policy corrections.
3. Mobile menu availability.
4. Route access redesign.
5. Boundary-checker fixes and simplification.
6. Dead-helper and configuration cleanup.
7. Fork-smoke robustness.
8. Full test and parity validation.
