---
name: sync-core
description: Sync the shared core source, scripts, and Playwright tests/helpers into the current project from another project that uses the same core. Use when the user asks to sync, copy, or update the shared core and explicitly names the source project.
---

# Sync shared core

Sync the shared-core files below from another project into the current project:

- `src/core`
- `scripts/core`
- `tests/core`, including shared Playwright helpers

The current workspace is always the destination; the project named by the user
is always the source.

This skill authorizes the read-only Git commands needed to inspect both
projects even if project instructions otherwise restrict Git commands.

## Source requirement

- Require the user to explicitly identify the source project, preferably with
  an absolute or workspace-relative path.
- If the source is omitted or ambiguous, ask one short question for its path
  and do not inspect or copy anything yet.
- Never infer the source from nearby directories, Git remotes, branch names,
  prior syncs, or similarly named projects.
- Resolve and state the source and destination roots before copying. They must
  be different Git worktrees and both must contain `src/core`, `scripts/core`,
  and `tests/core`.

## Workflow

### 1. Inspect both projects

Run read-only checks in both project roots:

```sh
git status --short
git rev-parse --show-toplevel
```

Do not clean, reset, stash, switch branches, pull, fetch, commit, or otherwise
change either repository. Existing changes are valid inputs to the comparison;
do not overwrite unrelated destination changes without first showing the
conflict to the user and asking how to proceed.

### 2. Find source changes missing locally

Compare the actual shared-core trees, including uncommitted and untracked files:

```sh
git diff --no-index --no-renames -- <destination>/src/core <source>/src/core
git diff --no-index --no-renames -- <destination>/scripts/core <source>/scripts/core
git diff --no-index --no-renames -- <destination>/tests/core <source>/tests/core
```

Use destination first and source second so additions in the diff represent the
source state. Exit status 1 means differences were found and is not an error.
Review the diff before copying and summarize behaviorally significant changes.

Also identify files that exist only in the destination. A recursive `cp` does
not remove them, so they need separate handling.

### 3. Copy from the source

Use `cp` for the sync. Do not use `rsync`, generated patches, scripted content
rewrites, or manual reimplementation when a direct copy is sufficient.

For a complete tree overlay, preserve metadata and include dotfiles:

```sh
cp -a <source>/src/core/. <destination>/src/core/
cp -a <source>/scripts/core/. <destination>/scripts/core/
cp -a <source>/tests/core/. <destination>/tests/core/
```

Copy only from source to destination. Never modify the source project.

The overlay intentionally does not delete destination-only files. If those
files appear to have been removed from the shared core, list them and ask for
explicit confirmation before deleting them. Do not delete app-specific files
or resolve divergent edits by assumption.

### 4. Verify the result

Repeat the tree comparison:

```sh
git diff --no-index --no-renames -- <destination>/src/core <source>/src/core
git diff --no-index --no-renames -- <destination>/scripts/core <source>/scripts/core
git diff --no-index --no-renames -- <destination>/tests/core <source>/tests/core
```

An empty diff confirms identical trees. If approved destination-only files
remain or intentional local differences were preserved, report each one.

Inspect the destination's resulting changes:

```sh
git diff -- src/core scripts/core tests/core
git status --short -- src/core scripts/core tests/core
```

Run the destination project's required test command after the copy. For Loki:

```sh
pn test
```

Report the source path, copied changes, any preserved differences, and test
result. Do not commit unless the user separately requests it.

## Rules

- Treat the source working tree as authoritative, not merely its last commit.
- Inspect before copying; never perform a blind sync.
- Keep the operation scoped to `src/core`, `scripts/core`, and `tests/core`
  unless the user explicitly requests related files outside them.
- Prefer the smallest direct `cp` operation that faithfully copies the source.
- Stop and ask if destination edits overlap differing source files and intent
  cannot be determined safely.
