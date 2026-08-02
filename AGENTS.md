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

# Browser Scripts

For client-side JavaScript, use the `Script` helper:

```tsx
<Script
    $exec={() => {
        // Your client-side JavaScript code here
    }}
/>
```

When a `Script` references an element, create its unique ID with `useId()` from `hono/jsx` and pass it through `$args`:

```tsx
const id = useId();
return (
    <div>
        <button id={id}>example</button>
        <Script
            $deps={[$select]}
            $args={[id]}
            $exec={(id) => {
                const button = $select.id(id, HTMLButtonElement);
                // ..rest of the code
            }}
        />
    </div>
);
```

Use `$select` from `@/core/utils` instead of calling `querySelector`, `querySelectorAll`, or `getElementById` directly. Use `$select.el(selector, Constructor)`, `$select.all(selector)`, and `$select.id(id, Constructor)`. Pass a root as the third argument for scoped queries. Use `$select.elOrNull` and `$select.idOrNull` when absence is valid. Pass the complete `$select` object to `Script` with `$deps={[$select]}`, never individual methods.

Use `$assertElement(el, typeclass)` for elements obtained through other APIs. Never use type casts or type arguments such as `el.closest<HTMLElement>("[data-loki-tooltip]");`.

Functions prefixed with `$` must be executable in the browser.

When creating more than one dom element use the $renderTemplate helper from `@/core/utils/render-template`

# Code Conventions

Write named functions with the `function` keyword. Use arrow functions only for anonymous functions, including callbacks.

Write all UI text in English.

Use the `@/` alias for imports from `src` (for example, `@/core/components/feedback`) instead of relative paths.

# Documentation

Every module-level declaration in `src/core`, including non-exported classes,
types, interfaces, functions, and variables, must have a JSDoc doc comment.
Every core class constructor, method, getter, setter, and overload must also
have a JSDoc doc comment.

Document all core components, their props, and helper functions. Describe
purpose, important props (via `@param props.name`), and any usage constraints or
caveats. Keep comments accurate when behavior changes.

# Forms

Do not use React-style `defaultValue` on form controls; Hono SSR does not map it to HTML `value`. Use `value={...}` for inputs and selects, and children or `value` for textareas. Mark the selected option with `selected`.

Opt saveable edit forms into unsaved-change tracking with `data-loki-confirm="Edit Jump"`, using the dialog title as the attribute value. Forms without `data-loki-confirm` are not tracked. Never add it to destructive or confirmation-gated forms.

## Return Navigation

For form return navigation, use `RedirectBackAfterPost` and
`IgnoreReturnRoute` from `@/core/components/return-after-form-post`; follow their
component doc comments.

# General guides

Never use git commands unless explicitly instructed.

Always run Node, pnpm, and other project tools via `mise exec --`:

```
mise exec -- pn test
mise exec -- node scripts/systemd-restart.mts
```

# Dependency Patches

Document every pnpm dependency patch in `PATCHES.md`. Include the package and
version, a link to the patch file, the reason for the patch, the errors or
behavior it fixes, and when the patch can be removed.

Update or remove the corresponding `PATCHES.md` entry whenever a patch changes
or is removed.

# Tests

After every change, run:

```
mise exec -- pn test
```

Comment-only changes do not require rerunning tests.

Note that this does automatic prettier formatting.

For visual changes, test user-facing functionality instead of exact visual
details. Do not add tests for specific spacing, divider counts, icon markup, or
other presentation-only implementation details.

For local D1 access in Playwright tests, use `createPlaywrightDatabase` and its
`PlaywrightDatabase` type from `tests/core/helpers.ts`. Put shared database test
helpers in that file instead of creating a nested helpers directory.

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

# Scripts

Use the `zx` module for external command execution

Use the `$$` pattern instead of helper functions.

```
import { $ } from "zx";
const $$ = $({ stdio: "inherit" });
```
