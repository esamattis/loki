---
name: browser-scripts
description: Use when adding or changing browser JavaScript, Script components, DOM selectors, client-side rendering, or $-prefixed browser functions.
---

# Browser scripts

Use `Script` from `@/core/components/script` for client-side JavaScript:

```tsx
<Script
    $exec={() => {
        // Browser-side code
    }}
/>
```

When a script references an element, create a unique ID with `useId()` from
`hono/jsx` and pass it through `$args`:

```tsx
const id = useId();
return (
    <button id={id}>
        Example
        <Script
            $deps={[$select]}
            $args={[id]}
            $exec={(id) => {
                const button = $select.id(id, HTMLButtonElement);
            }}
        />
    </button>
);
```

Use `$select` from `@/core/utils` instead of `querySelector`,
`querySelectorAll`, or `getElementById`.

- Use `$select.el(selector, Constructor)`, `$select.all(selector)`, and
  `$select.id(id, Constructor)`.
- Pass a root as the third argument for scoped queries.
- Use `$select.elOrNull` and `$select.idOrNull` when absence is valid.
- Pass the complete `$select` object with `$deps={[$select]}`, never individual
  selector methods.

Use `$assertElement(el, typeclass)` for elements obtained through other APIs.
Do not use type casts or type arguments such as
`el.closest<HTMLElement>("[data-loki-tooltip]")`.

Functions prefixed with `$` must be executable in the browser. When creating
more than one DOM element, use `$renderTemplate` from
`@/core/utils/render-template`.
