---
name: github-pr
description: Create a branch, commit changes, and open or update a GitHub pull request with gh. Use when the user asks for a PR, pull request, github pr, open a PR, or to push work for review.
---

# GitHub pull request

Use this skill when the user wants work landed as a GitHub pull request.

This skill authorizes git and `gh` usage for the PR workflow even if project
instructions otherwise restrict git commands.

## Workflow

### 1. Branch

- Create and check out a new branch with a short, descriptive name (for example
  `fix-login-redirect` or `add-jump-filter`).
- If the branch has **no local commits of your own yet** (no changes committed
  for this work), reset it to `origin/main`:

  ```bash
  git fetch origin
  git checkout -B <branch> origin/main
  ```

  Use `checkout -B` so an existing local branch name is recreated on top of
  `origin/main`. If you are already on a fresh branch with no commits ahead of
  main and a clean intent to start over, `git reset --hard origin/main` is fine.

- Do **not** reset if the branch already has commits that belong to this PR.

### 2. Implement

- Make the requested code changes on the branch.
- Follow project conventions (see `AGENTS.md` and existing code).

### 3. Verify

- Run the project test command and fix failures before committing:

  ```bash
  pn test
  ```

- Do not open or update a PR with failing tests unless the user explicitly
  asks to proceed anyway.

### 4. Commit

Before committing, inspect state:

```bash
git status
git diff
git log --oneline -10
```

Then:

- Stage only the files that belong to this work.
- Create one or more commits with concise messages that match repo style
  (`git log` is the style guide).
- Never update git config, use `--no-verify`, force-push, or commit secrets.
- Only commit when this skill’s PR workflow (or the user) requires it.

### 5. Push and pull request

```bash
git status
git diff origin/main...HEAD
gh pr view --json url,state,title 2>/dev/null || true
```

**If no PR exists for the current branch:**

```bash
git push -u origin HEAD
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<1-3 bullets of what changed and why>

## Test plan
- [ ] `pn test`
- [ ] <any extra checks>

EOF
)"
```

**If a PR already exists for the branch:**

```bash
git push
```

Do not create a second PR. Pushing updates the existing one.

### 6. Finish

- Return the PR URL to the user.
- Prefer `gh pr view --json url -q .url` after create or push.

## Rules

- Base PRs on `main` unless the user names another base.
- Keep the branch focused on the requested work; do not include unrelated
  local changes.
- If `gh` or `git push` fails (auth, network, hooks), fix or report the error;
  do not force-push or skip hooks unless the user explicitly requests it.
- Never force-push to `main`.
