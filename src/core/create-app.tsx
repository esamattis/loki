import { Context, Hono } from "hono";
import { TrieRouter } from "hono/router/trie-router";
import { eq, lte, sql } from "drizzle-orm";
import { jsxRenderer, useRequestContext } from "hono/jsx-renderer";
import { deleteCookie, getCookie } from "hono/cookie";
import { ViteClient } from "vite-ssr-components/hono";
import type { Child } from "hono/jsx";
import { htmxAsset, tailwindAsset } from "@/core/app-assets";
import { Footer } from "@/core/components/footer";
import { BackgroundGradients } from "@/core/components/background-gradients";
import { DisableViewTransitionsInAutomation } from "@/core/components/disable-view-transitions-in-automation";
import {
    DisableFormOnSubmit,
    ShowProgressOnLinkClick,
} from "@/core/components/navigation-progress";
import { RestoreFormScrollPosition } from "@/core/components/restore-form-scroll-position";
import { ServiceWorkerRegistration } from "@/core/components/service-worker-registration";
import { SocialMeta } from "@/core/components/social-meta";
import { ThemeScript } from "@/core/components/theme-script";
import { Tooltips } from "@/core/components/tooltips";
import { UnsavedChangesDialog as UnsavedChangesDialogComponent } from "@/core/components/unsaved-changes-dialog";
import { ReturnAfterFormPost } from "@/core/components/return-after-form-post";
import { UpdateToast as UpdateToastComponent } from "@/core/components/update-toast";
import { sessions, users } from "@/core/schema";
import * as routes from "@/core/routes";
import {
    findUserForAuth,
    hashToken,
    isSafeRedirectPath,
    parseBasicAuth,
    SESSION_COOKIE_NAME,
    sessionCookieOptions,
    SESSION_MAX_AGE,
} from "@/core/auth";
import { createD1Database, type AppDatabase } from "@/core/db";
import { User } from "@/core/user";
import { htmlCacheMiddleware } from "@/core/html-cache";
import {
    createServerTimings,
    setServerTiming,
    type ServerTimings,
} from "@/core/server-timing";
import {
    createCalendarDurationFormatter,
    createDateFormatter,
    createNumberFormatter,
    type CalendarDurationFormatter,
    type DateFormatter,
    type NumberFormatter,
} from "@/core/format";
import { isRegisteredPublicPath } from "@/core/register-route";

export type App = Hono<Env>;

export { User } from "@/core/user";

export interface CreateAppOptions {
    name: string;
    title: string;
    description: string;
    basicAuthRealm: string;
    authenticatedHome: string;
    logoPath: string;
    themeColor: string;
    socialImagePath: string;
    socialImageAlt: string;
    navigation?: () => Child;
    appMenuItems?: () => Child;
    registrationFields?: () => Child;
    preferencesContent?: () => Child;
    privacyPolicyContent: () => Child;
    afterUserCreated?: (
        context: AppContext,
        userUuid: string,
        appFormValues: Readonly<Record<string, string>>,
    ) => Promise<void>;
    beforeUserDeleted?: (
        context: AppContext,
        userUuid: string,
    ) => Promise<void>;
}

export type AppRequestContext = Context<Env>;

export interface AppContext {
    db: AppDatabase;
    sqlitePath?: string;
    user: User | null;
    getUser(): User;
    requestContext: AppRequestContext;
    cssDupCache: Set<string>;
    jsDupCache: Set<object>;
    serverTimings: ServerTimings;
    appOptions: CreateAppOptions;
    calendarDurationFormatter(): CalendarDurationFormatter;
    dateFormatter(): DateFormatter;
    numberFormatter(): NumberFormatter;
    isSelfHosted(): boolean;
    url(): URL;
}

export interface Variables {
    appContext: AppContext;
}

/** Bindings for Cloudflare Workers (D1) and optional Node self-host override. */
export interface AppBindings extends CloudflareBindings {
    /** Build a request-scoped Drizzle client for Node/self-host. */
    APP_DB_FACTORY?: (timings: ServerTimings) => AppDatabase;
    /** Absolute database path exposed by the self-contained Node binary. */
    APP_SQLITE_PATH?: string;
}

export interface Env {
    Bindings: AppBindings;
    Variables: Variables;
}

interface CachedFunction<T> {
    (c: AppContext): Promise<T>;
    clear: (c: AppContext) => void;
}

/**
 * Caches the result of a function call for the duration of the request.
 * If the function is called again with the same key, it will return the cached result.
 **/
export function cached<T>(
    _key: string,
    fn: (c: AppContext) => Promise<T>,
): CachedFunction<T> {
    const results = new WeakMap<AppContext, Promise<T>>();
    const cachedFn = async (c: AppContext) => {
        let result = results.get(c);
        if (!result) {
            result = fn(c);
            results.set(c, result);
        }
        return result;
    };

    cachedFn.clear = (c: AppContext) => {
        results.delete(c);
    };

    return cachedFn;
}

export function getAppContext(c: AppRequestContext): AppContext {
    if (!c.var.appContext) {
        throw new Error("App context not set in request context");
    }
    return c.var.appContext;
}

export function useAppContext(): AppContext {
    const c = useRequestContext<Env>();
    return getAppContext(c);
}

export function useCalendarDurationFormatter(): CalendarDurationFormatter {
    return useAppContext().calendarDurationFormatter();
}

export function useDateFormatter(): DateFormatter {
    return useAppContext().dateFormatter();
}

export function useNumberFormatter(): NumberFormatter {
    return useAppContext().numberFormatter();
}

export function createApp(options: CreateAppOptions): App {
    if (options.registrationFields && !options.afterUserCreated) {
        throw new Error("registrationFields requires afterUserCreated");
    }
    // The trie router remains mutable during Vite module reloads.
    const app = new Hono<Env>({ router: new TrieRouter() });
    registerErrorAndContext(app, options);
    registerAuthentication(app, options);
    registerPolicies(app);
    registerRenderer(app, options);
    return app;
}

function registerErrorAndContext(app: App, options: CreateAppOptions): void {
    function errorHandler(err: Error, c: AppRequestContext) {
        return c.render(
            <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm ring-1 ring-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:ring-red-900/40">
                <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-red-100 text-xl dark:bg-red-900/50">
                        ⚠
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg font-bold text-red-700 dark:text-red-400">
                            An error occurred
                        </h1>
                        <p className="mt-1 break-words text-sm text-red-900 dark:text-red-300">
                            <strong>Message:</strong> {err.message}
                        </p>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-red-500 dark:text-red-400">
                            Stack
                        </p>
                        <pre className="mt-1 overflow-x-auto rounded-lg bg-white/80 p-3 text-xs text-red-900 ring-1 ring-red-200 dark:bg-slate-900/80 dark:text-red-300 dark:ring-red-900/60">
                            {err.stack}
                        </pre>
                    </div>
                </div>
            </div>,
        );
    }

    app.onError(errorHandler);

    function notFoundHandler(c: AppRequestContext) {
        if (c.req.path.includes("__")) {
            return c.body("Not found", 404, { "Content-Type": "text/plain" });
        }

        c.status(404);
        return c.render(
            <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-6 px-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl dark:bg-slate-800">
                    🪂
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        404 — Not found
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        This page does not lead anywhere. Let's get you back.
                    </p>
                </div>
                <a
                    href={options.authenticatedHome}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                    Back to {options.name}
                </a>
            </div>,
        );
    }

    app.notFound(notFoundHandler);

    async function setAppContextMiddleware(
        c: AppRequestContext,
        next: () => Promise<void>,
    ) {
        const serverTimings = createServerTimings();
        c.set("appContext", {
            db:
                c.env.APP_DB_FACTORY?.(serverTimings) ??
                createD1Database(c.env.DB, serverTimings),
            sqlitePath: c.env.APP_SQLITE_PATH,
            user: null,
            getUser() {
                const user = this.user;
                if (!user) {
                    throw new Error("No user set in context");
                }
                return user;
            },
            requestContext: c,
            cssDupCache: new Set(),
            jsDupCache: new Set(),
            serverTimings,
            appOptions: options,
            calendarDurationFormatter() {
                return createCalendarDurationFormatter(this.numberFormatter());
            },
            dateFormatter() {
                return createDateFormatter(
                    this.getUser().options.dateTimeFormat,
                );
            },
            numberFormatter() {
                return createNumberFormatter(
                    this.getUser().options.numberFormat,
                );
            },
            isSelfHosted() {
                return Boolean(this.sqlitePath);
            },
            url() {
                // Use the request URL as provided by the runtime (Cloudflare
                // validates Host). Do not rebuild from the Host header.
                return new URL(c.req.url);
            },
        });
        try {
            await next();
        } finally {
            setServerTiming(c, serverTimings);
        }
    }

    app.use("*", setAppContextMiddleware);
}

function isPublicAssetPath(path: string) {
    return path.startsWith("/assets/");
}

function registerAuthentication(app: App, options: CreateAppOptions): void {
    function basicAuthChallenge(c: AppRequestContext) {
        return c.body("Invalid username or password", 401, {
            "WWW-Authenticate": `Basic realm="${options.basicAuthRealm}"`,
            "Content-Type": "text/plain; charset=utf-8",
        });
    }

    async function hasRegisteredUsers(db: AppDatabase): Promise<boolean> {
        const user = await db
            .select({ uuid: users.uuid })
            .from(users)
            .where(
                sql`coalesce(json_extract(${users.options}, '$.readonly'), 0) = 0`,
            )
            .limit(1)
            .get();
        return Boolean(user);
    }

    async function authenticateMiddleware(
        c: AppRequestContext,
        next: () => Promise<void>,
    ) {
        const path = c.req.path;
        const isPublicPath = isRegisteredPublicPath(app, path);

        if (isPublicAssetPath(path)) return next();

        const ctx = getAppContext(c);

        if (Math.random() < 0.1) {
            const now = Math.floor(Date.now() / 1000);
            await ctx.db
                .delete(sessions)
                .where(lte(sessions.expiresAt, now))
                .run();
        }

        const sessionToken = getCookie(c, SESSION_COOKIE_NAME);

        if (sessionToken) {
            const tokenHash = await hashToken(sessionToken);
            const now = Math.floor(Date.now() / 1000);
            const row = await ctx.db
                .select({
                    uuid: users.uuid,
                    username: users.username,
                    displayName: users.displayName,
                    email: users.email,
                    options: users.options,
                    admin: users.admin,
                    htmlCacheGeneration: users.htmlCacheGeneration,
                    expiresAt: sessions.expiresAt,
                    sessionLastUsedAt: sessions.lastUsedAt,
                    userLastUsedAt: users.lastUsedAt,
                })
                .from(sessions)
                .innerJoin(users, eq(sessions.userUuid, users.uuid))
                .where(eq(sessions.tokenHash, tokenHash))
                .limit(1)
                .get();

            if (row && row.expiresAt > now) {
                const {
                    expiresAt,
                    sessionLastUsedAt,
                    userLastUsedAt,
                    ...userRow
                } = row;
                void expiresAt;
                ctx.user = new User(ctx.db, userRow);
                // Throttle last-used writes to once per 5 minutes
                if (sessionLastUsedAt <= now - 5 * 60) {
                    await ctx.db
                        .update(sessions)
                        .set({
                            lastUsedAt: now,
                            expiresAt: now + SESSION_MAX_AGE,
                        })
                        .where(eq(sessions.tokenHash, tokenHash))
                        .run();
                }
                // User activity is less granular than individual session activity.
                if (userLastUsedAt <= now - 15 * 60) {
                    await ctx.db
                        .update(users)
                        .set({ lastUsedAt: now })
                        .where(eq(users.uuid, userRow.uuid))
                        .run();
                }
            } else {
                if (row) {
                    await ctx.db
                        .delete(sessions)
                        .where(eq(sessions.tokenHash, tokenHash))
                        .run();
                }
                deleteCookie(
                    c,
                    SESSION_COOKIE_NAME,
                    sessionCookieOptions(c.req.url),
                );
            }
        }

        if (ctx.isSelfHosted() && path === "/") {
            return c.redirect(routes.auth.login({}));
        }

        if (
            !ctx.user &&
            path !== routes.auth.register.route &&
            path !== routes.privacy.route &&
            (path === "/" || !isPublicPath) &&
            !(await hasRegisteredUsers(ctx.db))
        ) {
            return c.redirect(routes.auth.register({}));
        }

        if (!ctx.user && !isPublicPath) {
            const authorization = c.req.header("Authorization");
            const credentials = parseBasicAuth(authorization);
            if (credentials) {
                const [usernameOrEmail, password] = credentials;
                const user = await findUserForAuth(
                    ctx.db,
                    usernameOrEmail,
                    password,
                );
                if (user) {
                    ctx.user = user;
                }
            }

            if (!ctx.user) {
                if (authorization) {
                    return basicAuthChallenge(c);
                }
                const loginUrl = isSafeRedirectPath(path)
                    ? routes.auth.login({}, { back: path })
                    : routes.auth.login({});
                return c.redirect(loginUrl);
            }
        }

        await next();
    }

    app.use("*", authenticateMiddleware);
}

function registerPolicies(app: App): void {
    const PRIVACY_POLICY_ALLOWED_PATHS = new Set<string>([
        routes.privacy.route,
        routes.auth.logout.route,
        routes.serviceWorker.route,
    ]);

    async function privacyPolicyMiddleware(
        c: AppRequestContext,
        next: () => Promise<void>,
    ) {
        const ctx = getAppContext(c);
        if (
            ctx.isSelfHosted() ||
            isPublicAssetPath(c.req.path) ||
            isRegisteredPublicPath(app, c.req.path) ||
            !ctx.user ||
            ctx.user.options.privacyPolicyAccepted ||
            PRIVACY_POLICY_ALLOWED_PATHS.has(c.req.path)
        ) {
            return next();
        }

        const url = ctx.url();
        return c.redirect(
            routes.privacy({}, { back: url.pathname + url.search }),
        );
    }

    app.use("*", privacyPolicyMiddleware);

    app.use("*", readonlyMiddleware);

    app.use("*", htmlCacheMiddleware);

    const READONLY_ALLOWED_POST_PATHS = new Set<string>([
        routes.auth.logout.route,
        routes.privacy.route,
    ]);

    async function readonlyMiddleware(
        c: AppRequestContext,
        next: () => Promise<void>,
    ) {
        if (c.req.method !== "POST") {
            return next();
        }
        const user = getAppContext(c).user;
        if (!user?.readonly) {
            return next();
        }
        if (READONLY_ALLOWED_POST_PATHS.has(c.req.path)) {
            return next();
        }
        return c.redirect(routes.readonly({}));
    }
}

function registerRenderer(app: App, options: CreateAppOptions): void {
    app.use(
        "*",
        jsxRenderer((props, c) => {
            // fragment for htmx
            if (c.req.path.includes("__")) {
                return <>{props.children}</>;
            }

            const appContext = getAppContext(c);
            const user = appContext.user;

            const title = user
                ? `${user.getDisplayName()} – ${options.title}`
                : options.title;

            return (
                <html lang="en">
                    <head>
                        <meta charSet="UTF-8" />
                        <meta
                            name="viewport"
                            content="width=device-width, initial-scale=1.0"
                        />
                        <ViteClient />
                        <link rel="icon" href="/favicon.ico" sizes="any" />
                        <link
                            rel="icon"
                            href={options.logoPath}
                            type="image/svg+xml"
                        />
                        <link rel="manifest" href="/manifest.json" />
                        <meta name="theme-color" content={options.themeColor} />
                        <link
                            rel="apple-touch-icon"
                            sizes="72x72"
                            href="/apple-72x72.png"
                        />
                        <link
                            rel="apple-touch-icon"
                            sizes="144x144"
                            href="/apple-144x144.png"
                        />

                        <title>{title}</title>
                        <SocialMeta title={title} url={new URL(c.req.url)} />
                        <ThemeScript />
                        {user && (
                            <ServiceWorkerRegistration
                                workerUrl={routes.serviceWorker({})}
                            />
                        )}
                        <link
                            href={routes.assets.tailwindCss({
                                fingerprint: tailwindAsset.fingerprint,
                            })}
                            rel="stylesheet"
                        />
                        {/* After CSS so automation can override @view-transition. */}
                        <DisableViewTransitionsInAutomation />
                        <script
                            src={routes.assets.htmxScript({
                                fingerprint: htmxAsset.fingerprint,
                            })}
                            type="module"
                        ></script>
                    </head>
                    <body
                        style={{
                            ["--animation-duration"]: "5000ms",
                        }}
                        className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-200"
                    >
                        <BackgroundGradients />
                        <ReturnAfterFormPost />
                        <div className="flex-1">{props.children}</div>
                        <Footer
                            hasBottomNavigation={Boolean(user)}
                            showPrivacyPolicy={!appContext.isSelfHosted()}
                        />
                        <UnsavedChangesDialogComponent />
                        <UpdateToastComponent />
                        <RestoreFormScrollPosition />
                        <Tooltips />
                        <DisableFormOnSubmit />
                        <ShowProgressOnLinkClick />
                    </body>
                </html>
            );
        }),
    );
}
