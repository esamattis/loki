# Project

Use Hono.js with JSX and server-side rendering (SSR) only.

# Architecture Boundary

Core never imports app; app imports and configures core.

- Reusable application infrastructure belongs under `src/core`.
- Concrete application behavior belongs under `src/app`. In this repository,
  `src/app` is Loki and its logbook.
- `src/core` must not directly or indirectly import `@/app`.
- `src/app/index.tsx` is the concrete composition root. It creates and configures
  the core, then registers the application's routes and behavior.
- When core needs application-specific behavior, add the smallest direct input
  to the core API and provide it from app. Do not add feature registries,
  dependency lookups, or imports from core back into app.

# Components And Styling

Never destructure component props; use `props.propName`.

Use `useRequestContext()` in components instead of passing app context values through props.

Use Tailwind CSS for styling. Combine conditional classes with `clsx`.

For vanilla CSS, use the `Style` helper:

```tsx
<Style>
  .my-class {
    color: red;
  }
</Style>
```

Import `Style` from `@/core/components/style` and `Script` from `@/core/components/script`.

# Code Conventions

Write named functions with the `function` keyword. Use arrow functions only for anonymous functions, including callbacks.

Write all UI text in English.

Use the `@/` alias for imports from `src` (for example, `@/core/components/feedback`) instead of relative paths.

# General guides

Never use git commands unless explicitly instructed.

Pushing to `origin/main` triggers a production deployment.

Always run Node, pnpm, and other project tools via `mise exec --`:

```
mise exec -- pn test
mise exec -- node scripts/core/systemd-restart.mts
```

`mise exec -- pn test` runs the full browser and executable suites. Allow at
least ten minutes for it to finish.

# Lints

Lint-skip comments are allowed only in test files. Production code must be lint-clean.

If a function exceeds the lint line limit, split it into smaller functions.

If a file exceeds the lint line limit:

1. Extract a helper function or component into a shared helpers file.
2. If the helpers are local, create a directory named after the original file and move it there.

# Route Helpers

Use the nested helpers in `src/core/routes.ts` and `src/app/routes.ts` for every
internal URL and route parameter.

Each route handler exports `register(app)` for only its own endpoints. Register
all core handlers in `src/core/register-routes.ts` and concrete handlers in
`src/app/register-routes.ts`; never use side-effect imports for registration.
