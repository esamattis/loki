# Accounts and Preferences

## Core account data

`src/core/schema.ts` owns three tables:

- `users`, including identity, password hash, serialized options, admin state,
  activity timestamps, and HTML-cache generation;
- `sessions`, containing hashed tokens, ownership, expiry, and activity
  timestamps; and
- `invitations`, containing reusable invitation codes and remaining counts.

The concrete `src/app/schema.ts` re-exports these tables and adds the product
tables. Product records should normally reference `users.uuid` with the
appropriate deletion behavior.

Passwords are hashed with scrypt and a random salt. Login accepts a username or
email. Session tokens are cryptographically random and only their SHA-256
hashes are persisted.

## Registration and first-run behavior

The core registration page handles username, email, password, invitation, and
application-provided fields. The `CoreLayout` `registrationFields` content
adds product inputs, and `afterUserCreated` validates or persists them.

The first normal account is the bootstrap administrator. After one exists,
registration requires an invitation created by an administrator. After
successful creation, core starts a session. If the application hook fails,
registration compensates for the created core records and restores a consumed
invitation before returning the error.

Account uniqueness checks cover normalized username and email conflicts. The
application hook remains responsible for validating its own fields and
initializing its own data.

## User options

Core stores account options as JSON in `users.options`.
`CoreUserOptionsSchema` defines:

| Option                  | Purpose                        |
| ----------------------- | ------------------------------ |
| `dateTimeFormat`        | Date formatting convention     |
| `numberFormat`          | Number formatting convention   |
| `htmlCacheEnabled`      | Per-user HTML cache preference |
| `privacyPolicyAccepted` | Hosted privacy acceptance      |
| `readonly`              | Mutation policy state          |

The schema is passthrough so the application can extend it:

```ts
export const ProductUserOptionsSchema = CoreUserOptionsSchema.extend({
    productSetting: z.string().default("example"),
});
```

The application owns the complete default options JSON used for new users.
Keep the database column default stable and populate the complete options at
account creation instead of changing the Drizzle default whenever an
application option changes.

`User` wraps the authenticated record, parses core options, provides display
and policy helpers, and persists complete option replacements. Application
code should parse the merged object with its complete option schema before
writing it.

## Preferences

The core `/preferences` page owns one saveable account form for display
identity, password changes, formatting, and HTML caching. Product fields are
inserted into that same form through `CoreLayout`:

- `preferencesContent` after Profile
- `preferencesAfterFormatting` after Formatting
- `preferencesDangerContent` inside the shared Danger Zone

When those slots are used, `CreateAppRouterOptions` must also provide
`validatePreferencesForm` and `preparePreferencesSave`. The preparation hook
returns application-owned option values and optional unexecuted statements;
core batches them atomically with its account and option updates. The hook must
not execute writes itself.

Saveable edit forms can participate in unsaved-change tracking and return
navigation. Destructive forms should remain separate and confirmation-gated.
See [SSR UI and browser behavior](ssr-ui-and-browser-behavior.md) for the form
protocol.

## Administration

The reusable `/admin` area provides:

- user overview and activity information;
- granting and revoking administrator access;
- switching into another user's account;
- toggling read-only state;
- viewing or revoking active sessions; and
- creating and editing invitation codes.

Application-specific admin content belongs in `src/app` and may be linked from
the app menu or registered on product-owned admin routes. Core admin handlers
verify administrator status; product-owned admin handlers must do the same
when they expose privileged behavior.

## Account deletion hooks

Before deleting a user, core calls the optional `prepareUserDeletion` hook. Use
it to return unexecuted anonymization or cleanup statements that cannot be
expressed through foreign-key cascades. Core executes those statements and the
user deletion in one atomic database batch. The hook must not execute writes
itself. Session and product records configured with cascading foreign keys are
removed with the user.

Deletion is intentionally available even to a read-only user. It is a
confirmation-gated account action, not a normal saveable edit form.
