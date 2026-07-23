# Project

Use Hono.js with JSX and server-side rendering (SSR) only.

# Components And Styling

Never destructure component props; use `props.propName`.

Use Tailwind CSS for styling. Combine conditional classes with `clsx`.

For vanilla CSS, use the `Style` helper:

```tsx
<Style>
  .my-class {
    color: red;
  }
</Style>
```

Import `Style` from `@/components/style` and `Script` from `@/components/script`.

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

Use `$select` from `@/utils` instead of calling `querySelector`, `querySelectorAll`, or `getElementById` directly. Use `$select.el(selector, Constructor)`, `$select.all(selector)`, and `$select.id(id, Constructor)`. Pass a root as the third argument for scoped queries. Use `$select.elOrNull` and `$select.idOrNull` when absence is valid. Pass the complete `$select` object to `Script` with `$deps={[$select]}`, never individual methods.

Use `$assertElement(el, typeclass)` for elements obtained through other APIs. Never use type casts or type arguments such as `el.closest<HTMLElement>("[data-loki-tooltip]");`.

Functions prefixed with `$` must be executable in the browser.

When creating more than one dom element use the $renderTemplate helper from `@/utils/render-template`

# Code Conventions

Write named functions with the `function` keyword. Use arrow functions only for anonymous functions, including callbacks.

Write all UI text in English.

Use the `@/` alias for imports from `src` (for example, `@/components/feedback`) instead of relative paths.

# Forms

Do not use React-style `defaultValue` on form controls; Hono SSR does not map it to HTML `value`. Use `value={...}` for inputs and selects, and children or `value` for textareas. Mark the selected option with `selected`.

Opt saveable edit forms into unsaved-change tracking with `data-loki-confirm="Edit Jump"`, using the dialog title as the attribute value. Forms without `data-loki-confirm` are not tracked. Never add it to destructive or confirmation-gated forms.

## Return Navigation

For form return navigation, use `RedirectBackAfterPost` and
`IgnoreReturnRoute` from `@/components/return-after-form-post`; follow their
component doc comments.

# Terminology

"Jump items" are gear, locations, aircraft, and jump types assignable to a jump.

# General guides

Never use git commands unless explicitly instructed.

Never use subagents unless explicitly instructed.

# Dependency Patches

Document every pnpm dependency patch in `PATCHES.md`. Include the package and
version, a link to the patch file, the reason for the patch, the errors or
behavior it fixes, and when the patch can be removed.

Update or remove the corresponding `PATCHES.md` entry whenever a patch changes
or is removed.

# Tests

After every change, run:

```
pn test
```

Comment-only changes do not require rerunning tests.

Note that this does automatic prettier formatting.

For local D1 access in Playwright tests, use `executePlaywrightDb` and
`queryPlaywrightDb` from `tests/helpers.ts`. Do not reimplement wrangler D1
commands in individual specs.

# Lints

Lint-skip comments are allowed only in test files. Production code must be lint-clean.

If a function exceeds the lint line limit, split it into smaller functions.

If a file exceeds the lint line limit:

1. Extract a helper function or component into a shared helpers file.
2. If the helpers are local, create a directory named after the original file and move it there.

# Route Helpers

Use the nested helpers in `src/routes.tsx` for every internal URL and route
parameter. They define the route-handler file layout; see that module's comment.

Each route handler exports `register(app)` for only its own endpoints. Register
all handlers explicitly in `src/app/register-routes.ts`; never use side-effect
imports for registration.

# Scripts

Use the `zx` module for external command execution

Use the `$$` pattern instead of helper functions.

```
import { $ } from "zx";
const $$ = $({ stdio: "inherit" });
```
