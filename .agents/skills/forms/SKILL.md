---
name: forms
description: Use when creating or changing forms, form controls, saveable edit forms, unsaved-change tracking, or return navigation.
---

# Forms

Hono SSR does not map React-style `defaultValue` to an HTML `value` attribute.

- Use `value={...}` for inputs and selects.
- Use children or `value` for textareas.
- Mark the selected option with `selected`.

Opt saveable edit forms into unsaved-change tracking with
`data-loki-confirm="Edit Jump"`, using the dialog title as the attribute value.
Do not add it to destructive or confirmation-gated forms.

For return navigation after a form post, use `RedirectBackAfterPost` and
`IgnoreReturnRoute` from `@/core/components/return-after-form-post`. Follow
their component documentation.
