---
name: core-development
description: Use when changing src/core, extracting reusable behavior into core, or designing the application inputs that configure core.
---

# Core development

Core never imports app. `src/app` configures and consumes `src/core`.

When core needs application-specific behavior, add the smallest direct input to
the core API and provide it from app. Do not add feature registries, dependency
lookups, or imports from core back into app.

Every module-level declaration in `src/core`, including non-exported classes,
types, interfaces, functions, and variables, requires a JSDoc doc comment.
Every core class constructor, method, getter, setter, and overload also requires
a JSDoc doc comment.

Document all core components, their props, and helper functions. Describe the
purpose, important props with `@param props.name`, and usage constraints or
caveats. Keep documentation accurate when behavior changes.
