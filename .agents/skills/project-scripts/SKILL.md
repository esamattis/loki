---
name: project-scripts
description: Use when adding or changing files under scripts/ or package commands that invoke project scripts.
---

# Project scripts

Use the `.mts` extension for scripts.

- Put reusable core scripts in `scripts/core`.
- Keep application-specific scripts directly under `scripts`.

Always use asynchronous I/O unless explicitly asked not to.

Use the `zx` module for external command execution and use the `$$` pattern:

```ts
import { $ } from "zx";

const $$ = $({ stdio: "inherit" });
```
