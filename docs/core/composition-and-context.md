# Composition and Request Context

## Creating the application

`createAppRouter` in `src/core/create-app.tsx` constructs the shared `AppRouter`,
a Hono application using `TrieRouter`. The concrete composition root,
`src/app/index.tsx`, passes a `CreateAppRouterOptions` object containing:

- product identity and metadata such as name, title, repository URL, logo,
  theme color, and social image;
- one full-document `render` function;
- the authenticated home URL and HTTP Basic authentication realm; and
- optional account lifecycle hooks.

The renderer normally composes two core components:

- `AppShell` renders the HTML document, head metadata and assets, and body.
- `CoreLayout` renders the shared body layout and receives authenticated
  navigation, menu, footer, privacy policy, registration, and preferences
  content as component props.

This keeps `createAppRouter` focused on application infrastructure while
allowing the concrete application to replace the document shell or UI layout
independently.

```tsx
function renderApp(props: AppRouterRenderProps) {
    return (
        <AppShell>
            <CoreLayout
                authenticatedUserSubtitle={authenticatedUserSubtitle}
                navigationLabel="Application actions"
                menuItems={<ApplicationMenuItems />}
                privacyPolicyContent={<PrivacyPolicyContent />}
            >
                {props.children}
            </CoreLayout>
        </AppShell>
    );
}

export const appRouter = createAppRouter({
    // Product metadata and runtime configuration.
    render: renderApp,
});
```

The renderer middleware returns HTMX fragment content directly. The
application renderer is responsible only for full documents.

The account hooks are:

- `afterUserCreated(context, userUuid, appFormValues)`, used to initialize
  product options or related records after core creates an account; and
- `beforeUserDeleted(context, userUuid)`, used to scrub or remove product data
  before core deletes the account.

Providing `CoreLayout` with `registrationFields` requires configuring
`afterUserCreated` in `createAppRouter`. Registration is compensated if
application initialization fails, so a partially initialized account is not
left behind.

## Installed middleware

`createAppRouter` installs the shared behavior in this order:

1. Error and not-found handlers.
2. A request-scoped `RequestContext`.
3. Authentication.
4. Privacy, read-only, and HTML-cache policies.
5. The JSX document renderer.

Routes are registered separately. Call `registerCoreRoutes(app)` once before
registering the concrete application's handlers.

## Request-scoped services

`RequestContext` is created for every request and contains:

- `appRouter` and its immutable `appOptions`;
- a Drizzle database client;
- the authenticated `user`, when present;
- the Hono request context and current request URL;
- optional SQLite path information for self-host detection;
- SQL and page timing counters;
- per-render duplicate suppression for `Style` and `Script`; and
- locale-aware date, number, and calendar-duration formatters.

In handlers, obtain it from the Hono context:

```ts
const requestContext = getRequestContext(c);
const user = requestContext.getUser();
```

In JSX components, use `useRequestContext()` instead of threading application
context through props:

```tsx
export function ExamplePanel() {
    const requestContext = useRequestContext();
    return <p>Hello, {requestContext.getUser().getDisplayName()}</p>;
}
```

`getUser()` deliberately throws when no authenticated user exists. Components
or handlers that can run publicly should inspect `requestContext.user` instead.

The formatter hooks derive their locale choices from the authenticated user's
core options:

```tsx
const formatDate = useDateFormatter();
const formatNumber = useNumberFormatter();
const formatDuration = useCalendarDurationFormatter();
```

## Runtime bindings

The request environment supports both deployment modes:

- Cloudflare supplies the `DB` D1 binding.
- Node supplies `APP_DB_FACTORY`, which creates the request's SQLite-backed
  Drizzle client.

`APP_SQLITE_PATH` is set by the self-contained executable. Core uses its
presence to identify self-hosted behavior, including privacy-policy and initial
login differences.
