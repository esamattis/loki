---
name: systemd
description: Manage the Loki systemd user service. Use when starting, stopping, restarting, enabling, inspecting, troubleshooting, or changing the Loki service.
---

# Loki systemd service

Manage Loki as a systemd user service. Never use `sudo` or the system-level
`systemctl` commands for this service.

## Service configuration

- Unit: `~/.config/systemd/user/loki.service`
- Executable: `/home/esamatti/code/loki/dist-executable/loki`
- Address: `http://0.0.0.0:4832`
- Boot target: `default.target`
- User lingering must remain enabled so the service starts at boot without a
  login session.

## Lifecycle commands

Always rebuild the self-contained executable before starting or restarting the
service. Run the build from `/home/esamatti/code/loki` as the current user:

```sh
pn build:executable
systemctl --user start loki.service
```

```sh
pn build:executable
systemctl --user restart loki.service
```

Stopping and inspecting the service do not require a rebuild:

```sh
systemctl --user stop loki.service
systemctl --user status loki.service --no-pager
```

Enabling with `--now` also starts the service, so rebuild first:

```sh
pn build:executable
systemctl --user enable --now loki.service
```

Disabling and stopping the service does not require a rebuild:

```sh
systemctl --user disable --now loki.service
```

## Logs and diagnostics

Follow logs:

```sh
journalctl --user -u loki.service -f
```

Inspect logs from the current boot:

```sh
journalctl --user -u loki.service -b --no-pager
```

Check service and boot configuration:

```sh
systemctl --user is-active loki.service
systemctl --user is-enabled loki.service
loginctl show-user "$USER" -p Linger
curl --fail http://127.0.0.1:4832
```

If lingering is disabled, enable it as the current user:

```sh
loginctl enable-linger "$USER"
```

## Applying changes

After changing the unit, verify it, reload the user manager, and restart Loki:

```sh
systemd-analyze --user verify ~/.config/systemd/user/loki.service
systemctl --user daemon-reload
pn build:executable
systemctl --user restart loki.service
```

Confirm both that the service remains active and that its HTTP endpoint
responds after every start or restart.
