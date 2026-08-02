---
name: systemd
description: Manage this project's systemd user service. Use when starting, stopping, restarting, enabling, inspecting, troubleshooting, or changing the user service. Service unit name is package.json name + .service.
---

# systemd user service

Manage this project as a systemd **user** service. Never use `sudo` or
system-level `systemctl` (without `--user`) for this service.

## Service name

The unit name is `{package.json name}.service` (for example, package name
`loki` → `loki.service`).

- Unit file: `~/.config/systemd/user/{name}.service`
- Boot target: `default.target`
- User lingering must remain enabled so the service starts at boot without a
  login session.

Resolve `{name}` from the project root `package.json` `"name"` field. Do not
hardcode a project-specific unit name.

## Lifecycle commands

Prefer the project script for restart-or-start:

```sh
mise exec -- node scripts/systemd-restart.mts
```

That script reads the unit name from `package.json`, errors if the matching
user unit is not installed, runs `pnpm run build:executable`, then
`systemctl --user restart` (starts the unit when it is not already running).

Use `--missing-ok` to exit successfully when the unit is not installed:

```sh
mise exec -- node scripts/systemd-restart.mts --missing-ok
```

Manual equivalents (replace `{name}` with the package name):

```sh
systemctl --user start {name}.service
systemctl --user restart {name}.service
systemctl --user stop {name}.service
systemctl --user status {name}.service --no-pager
```

Enabling with `--now` also starts the service (rebuild first when needed):

```sh
systemctl --user enable --now {name}.service
```

Disabling and stopping does not require a rebuild:

```sh
systemctl --user disable --now {name}.service
```

## Logs and diagnostics

```sh
journalctl --user -u {name}.service -f
journalctl --user -u {name}.service -b --no-pager
systemctl --user is-active {name}.service
systemctl --user is-enabled {name}.service
loginctl show-user "$USER" -p Linger
```

If lingering is disabled, enable it as the current user:

```sh
loginctl enable-linger "$USER"
```

## Applying unit changes

After changing the unit file, verify it, reload the user manager, and restart:

```sh
systemd-analyze --user verify ~/.config/systemd/user/{name}.service
systemctl --user daemon-reload
mise exec -- node scripts/systemd-restart.mts
```

Confirm the service is active after every start or restart:

```sh
systemctl --user status {name}.service --no-pager
```
