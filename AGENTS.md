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

`Style` and `Script` are imported from the project's `helpers.tsx` file.

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
            $args={[id]}
            $exec={(id) => {
                const button = document.getElementById(id);
                $assertElement(button, HTMLButtonElement);
                // ..rest of the code
            }}
        />
    </div>
);
```

Always assert elements with `$assertElement(el, typeclass)`. Never use type casts or type arguments such as `el.closest<HTMLElement>("[data-tooltip]");`.

Functions prefixed with `$` must be executable in the browser.

# Code Conventions

Write named functions with the `function` keyword. Use arrow functions only for anonymous functions, including callbacks.

Write all UI text in English.

Use the `@/` alias for imports from `src` (for example, `@/components/feedback`) instead of relative paths.

# Forms

Do not use React-style `defaultValue` on form controls; Hono SSR does not map it to HTML `value`. Use `value={...}` for inputs and selects, and children or `value` for textareas. Mark the selected option with `selected`.

# Terminology

"Jump items" are gear, locations, aircraft, and jump types assignable to a jump.

# Tests

After every change, run:

```
pn test
```

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
