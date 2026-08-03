---
name: playwright-testing
description: Use when adding or changing Playwright tests, fixtures, browser-test helpers, or local D1 access in tests.
---

# Playwright testing

For visual changes, test user-facing functionality rather than presentation
details. Do not test exact spacing, divider counts, icon markup, or other
presentation-only implementation details.

For local D1 access in Playwright tests, use `createPlaywrightDatabase` and the
`PlaywrightDatabase` type from `tests/core/helpers.ts`. Put shared database test
helpers in that file instead of creating a nested helpers directory.
