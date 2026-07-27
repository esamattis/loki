# SSR UI and Browser Behavior

## Server-rendered document shell

Core uses Hono JSX and server-side rendering. `registerRenderer` wraps rendered
pages with the shared document:

- product metadata, social metadata, icons, and theme color;
- fingerprinted Tailwind CSS and HTMX assets;
- theme initialization and authenticated service-worker registration;
- background, footer, update, tooltip, navigation-progress, unsaved-change,
  form-scroll, and return-navigation behavior.

`AppPage` provides the authenticated page layout, header, responsive content
area, mobile action area, application navigation, and account menu. Product
pages provide their content as JSX and may provide a mobile form action.

Requests whose path contains `__` render only their JSX fragment. This is the
convention used by HTMX fragment endpoints; not-found responses for these paths
are plain text rather than a full document.

## Shared UI components

Reusable components live under `src/core/components`. Major groups include:

- links, authentication shells, feedback, icons, social metadata, and build
  information;
- form controls and action components;
- theme, footer, menu, tooltip, and update behavior;
- dialogs, dropdown menus, details, section headers, code blocks, danger zones,
  and confirmation buttons under `components/ui`; and
- `AppPage`, `AppHeader`, and `MainMenu` for authenticated layout.

Components obtain application and user state with `useAppContext()`. Component
props are accessed as `props.name`; they are not destructured. Tailwind is the
default styling mechanism, with `clsx` for conditional class names.

## Scoped CSS

Use `Style` for CSS that cannot reasonably be expressed with Tailwind:

```tsx
<Style>
    {`
        .example {
            text-wrap: balance;
        }
    `}
</Style>
```

`Style` suppresses duplicate CSS within a rendered request. Import it from
`@/core/components/style`.

## Browser scripts

Use `Script` rather than embedding arbitrary client modules:

```tsx
const id = useId();

return (
    <>
        <button id={id}>Run</button>
        <Script
            $deps={[$select]}
            $args={[id]}
            $exec={(id) => {
                const button = $select.id(id, HTMLButtonElement);
                button.addEventListener("click", () => {
                    button.textContent = "Done";
                });
            }}
        />
    </>
);
```

`Script` serializes its executable function, dependencies, and JSON arguments
into the SSR output. It emits each dependency and function once per request.
Functions intended for the browser use the `$` prefix.

Use the complete `$select` object for DOM queries:

- `$select.id` and `$select.idOrNull` for unique IDs;
- `$select.el` and `$select.elOrNull` for one selector; and
- `$select.all` for all matches, optionally scoped to a root.

For elements returned by another browser API, use `$assertElement`. Avoid DOM
type casts. Use `$renderTemplate` when creating more than one DOM element from
markup.

## Forms

The form component library provides buttons, inputs, selects, textareas,
checkboxes, password controls, and action groups with consistent accessible
markup.

Hono SSR requires HTML values to be explicit:

- use `value={...}` for inputs and selects;
- mark the chosen `<option>` with `selected`; and
- put textarea values in its children or `value`.

Do not use React-style `defaultValue`.

Add `data-loki-confirm="Dialog title"` to saveable create or edit forms that
need an unsaved-change warning. Do not add it to destructive or
confirmation-gated forms.

Render `RedirectBackAfterPost` inside an ordinary saveable form when a
successful POST should return to the page that opened it. The browser stores
the source pathname and query, keeps the state through validation responses,
and falls back to the server redirect when the Navigation API is unavailable.
Do not use it for authentication, destructive, import/export, confirmation, or
canonical-destination forms.

`IgnoreReturnRoute` makes an intermediary list page transparent to that return
chain. `ClearReturnRoute` deliberately discards a stored chain. Their component
doc comments in `src/core/components/return-after-form-post.tsx` are the source
of truth for edge cases.

## Stable browser protocol

Attributes and storage keys prefixed with `data-loki-*` or `loki` are stable
internal browser protocol names. They coordinate SSR markup, embedded scripts,
tests, and persisted browser state; they are not product branding and do not
need to be renamed by a fork.
