import { Context, Hono } from "hono";
import { TrieRouter } from "hono/router/trie-router";
import { eq, lte, sql } from "drizzle-orm";
import { jsxRenderer, useRequestContext } from "hono/jsx-renderer";
import { deleteCookie, getCookie } from "hono/cookie";
import { ViteClient } from "vite-ssr-components/hono";
import { Script } from "@/components/script";
import { htmxAsset, tailwindAsset } from "@/app-assets";
import { Button } from "@/components/form";
import { Footer } from "@/components/footer";
import { BackgroundGradients } from "@/components/background-gradients";
import { Dialog } from "@/components/ui/dialog";
import { DisableViewTransitionsInAutomation } from "@/components/disable-view-transitions-in-automation";
import {
    DisableFormOnSubmit,
    ShowProgressOnLinkClick,
} from "@/components/navigation-progress";
import { RestoreFormScrollPosition } from "@/components/restore-form-scroll-position";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { SocialMeta } from "@/components/social-meta";
import { ThemeScript } from "@/components/theme-script";
import { Tooltips } from "@/components/tooltips";
import { UnsavedChangesDialog as UnsavedChangesDialogComponent } from "@/components/unsaved-changes-dialog";
import { ReturnAfterFormPost } from "@/components/return-after-form-post";
import { UpdateToast as UpdateToastComponent } from "@/components/update-toast";
import { sessions, users } from "@/schema";
import * as routes from "@/routes";
import {
    findUserForAuth,
    hashToken,
    isSafeRedirectPath,
    parseBasicAuth,
    SESSION_COOKIE_NAME,
    sessionCookieOptions,
    SESSION_MAX_AGE,
} from "@/auth";
import { createD1Database, type AppDatabase } from "@/db";
import { User } from "@/app/user";
import { htmlCacheMiddleware } from "@/app/html-cache";
import {
    createServerTimings,
    setServerTiming,
    type ServerTimings,
} from "@/server-timing";
import { $select } from "@/utils";
import {
    createAltitudeFormatter,
    createDateFormatter,
    createDistanceFormatter,
    createNumberFormatter,
    createSpeedFormatter,
    type AltitudeFormatter,
    type DateFormatter,
    type DistanceFormatter,
    type NumberFormatter,
    type SpeedFormatter,
} from "@/format";

export type App = Hono<Env>;

export { User } from "@/app/user";

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
    altitudeFormatter(): AltitudeFormatter;
    dateFormatter(): DateFormatter;
    distanceFormatter(): DistanceFormatter;
    numberFormatter(): NumberFormatter;
    speedFormatter(): SpeedFormatter;
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

// The trie router remains mutable during Vite module reloads.
export const app = new Hono<Env>({ router: new TrieRouter() });

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

export function useAltitudeFormatter(): AltitudeFormatter {
    return useAppContext().altitudeFormatter();
}

export function useDateFormatter(): DateFormatter {
    return useAppContext().dateFormatter();
}

export function useNumberFormatter(): NumberFormatter {
    return useAppContext().numberFormatter();
}

export function useSpeedFormatter(): SpeedFormatter {
    return useAppContext().speedFormatter();
}

export function $restoreFormScrollPosition() {
    const storageKey = "form-scroll-position";
    const storedPosition = sessionStorage.getItem(storageKey);

    if (storedPosition) {
        const parts = storedPosition.split(",");
        const pathname = parts[0];
        const x = Number(parts[1]);
        const y = Number(parts[2]);
        if (
            pathname === window.location.pathname &&
            Number.isFinite(x) &&
            Number.isFinite(y)
        ) {
            window.scrollTo(x, y);
        }
        sessionStorage.removeItem(storageKey);
    }

    document.addEventListener("submit", () => {
        sessionStorage.setItem(
            storageKey,
            `${window.location.pathname},${window.scrollX},${window.scrollY}`,
        );
    });
}

/*
<CODEREVIEW>
[low] This entire unsaved-changes implementation is dead duplicate code. The
layout renders the imported `UnsavedChangesDialogComponent`, and no code uses
these exported declarations. Remove this block and the now-unused `Button` and
`Dialog` imports so fixes have only one source of truth.
</CODEREVIEW>
*/
const UNSAVED_CHANGES_DIALOG_ID = "unsaved-changes-dialog";

function $isFormDirty(): boolean {
    return document.documentElement.dataset.lokiFormDirty === "true";
}

function $clearFormDirty(): void {
    delete document.documentElement.dataset.lokiFormDirty;
}

function $markFormDirtyFromEvent(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) {
        return;
    }
    const form = target.closest("form");
    if (!(form instanceof HTMLFormElement)) {
        return;
    }
    if (form.method.toLowerCase() !== "post") {
        return;
    }
    if (!(
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
    )) {
        return;
    }
    if (target instanceof HTMLInputElement && target.type === "hidden") {
        return;
    }
    document.documentElement.dataset.lokiFormDirty = "true";
}

function $navigationHrefFromClick(event: MouseEvent): string | null {
    if (event.defaultPrevented) {
        return null;
    }
    if (event.button !== 0) {
        return null;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return null;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
        return null;
    }

    const anchor = target.closest("a");
    if (!(anchor instanceof HTMLAnchorElement)) {
        return null;
    }

    if (!anchor.href) {
        return null;
    }
    if (anchor.hasAttribute("download")) {
        return null;
    }
    if (anchor.target && anchor.target !== "_self") {
        return null;
    }

    let url: URL;
    try {
        url = new URL(anchor.href, window.location.href);
    } catch {
        return null;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        return null;
    }
    if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search &&
        url.hash !== ""
    ) {
        return null;
    }
    if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search &&
        url.hash === window.location.hash
    ) {
        return null;
    }

    return anchor.href;
}

export function $guardUnsavedFormChanges(dialogId: string) {
    let pendingHref: string | null = null;

    document.addEventListener("input", $markFormDirtyFromEvent, true);
    document.addEventListener("change", $markFormDirtyFromEvent, true);

    document.addEventListener(
        "submit",
        (event) => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement)) {
                return;
            }
            if (form.method.toLowerCase() !== "post") {
                return;
            }
            $clearFormDirty();
        },
        true,
    );

    window.addEventListener("beforeunload", (event) => {
        if (!$isFormDirty()) {
            return;
        }
        event.preventDefault();
        event.returnValue = "";
    });

    const dialog = $select.id(dialogId, HTMLDialogElement);

    dialog.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLButtonElement)) {
            return;
        }
        if (target.value !== "ok") {
            return;
        }
        const href = pendingHref;
        pendingHref = null;
        $clearFormDirty();
        dialog.close();
        if (href) {
            window.location.href = href;
        }
    });

    document.addEventListener(
        "click",
        (event) => {
            if (!$isFormDirty()) {
                return;
            }
            const href = $navigationHrefFromClick(event);
            if (!href) {
                return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            pendingHref = href;
            dialog.showModal();
        },
        true,
    );
}

export function UnsavedChangesDialog() {
    return (
        <Dialog
            id={UNSAVED_CHANGES_DIALOG_ID}
            title="Unsaved changes"
            description="You have unsaved changes. Leave this page without saving?"
        >
            <div className="flex justify-end">
                <Button type="button" value="ok" variant="primary">
                    Leave
                </Button>
            </div>
        </Dialog>
    );
}

export function $applyStoredTheme() {
    try {
        let theme = localStorage.getItem("theme");
        if (theme !== "light" && theme !== "dark") {
            theme = "system";
        }
        document.documentElement.classList.toggle("light", theme === "light");
        document.documentElement.classList.toggle("dark", theme === "dark");
        document.documentElement.style.removeProperty("color-scheme");
    } catch (error) {
        console.error("Failed to apply the stored theme", error);
    }
}

const UPDATE_TOAST_ID = "update-toast";

function $showUpdateToast(toastId: string) {
    const toast = $select.idOrNull(toastId, HTMLElement);
    if (!toast) return;
    toast.hidden = false;
}

export function $registerServiceWorker(workerUrl: string, toastId: string) {
    if (!("serviceWorker" in navigator)) {
        return;
    }
    const hadControllerOnLoad = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker
        .register(workerUrl)
        .then((registration) => {
            if (registration.waiting) {
                $showUpdateToast(toastId);
            }
            registration.addEventListener("updatefound", () => {
                const installingWorker = registration.installing;
                if (!installingWorker) {
                    return;
                }
                installingWorker.addEventListener("statechange", () => {
                    if (
                        installingWorker.state === "installed" &&
                        navigator.serviceWorker.controller
                    ) {
                        $showUpdateToast(toastId);
                    }
                });
            });
        })
        .catch((error) => {
            console.error("Failed to register the service worker", error);
        });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!hadControllerOnLoad) {
            return;
        }
        $showUpdateToast(toastId);
    });
}

export function UpdateToast() {
    return (
        <div
            id={UPDATE_TOAST_ID}
            hidden
            role="status"
            aria-live="polite"
            className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
            <span className="text-sm text-slate-700 dark:text-slate-300">
                A new version is available.
            </span>
            <button
                type="button"
                data-loki-update-toast-reload
                className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
                Reload
            </button>
            <button
                type="button"
                data-loki-update-toast-dismiss
                className="rounded-lg px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
                Dismiss
            </button>
            <Script
                $deps={[$select]}
                $args={[UPDATE_TOAST_ID]}
                $exec={(toastId: string) => {
                    const toast = $select.id(toastId, HTMLDivElement);
                    const reload = $select.el(
                        "[data-loki-update-toast-reload]",
                        HTMLButtonElement,
                        toast,
                    );
                    reload.addEventListener("click", () => {
                        window.location.reload();
                    });
                    const dismiss = $select.el(
                        "[data-loki-update-toast-dismiss]",
                        HTMLButtonElement,
                        toast,
                    );
                    dismiss.addEventListener("click", () => {
                        toast.hidden = true;
                    });
                }}
            />
        </div>
    );
}

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
                    This page drift does not lead anywhere. Let's get you back
                    to your logbook.
                </p>
            </div>
            <a
                href={routes.logbook.index({})}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
                Back to logbook
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
        altitudeFormatter() {
            const options = this.getUser().options;
            return createAltitudeFormatter(
                options.altitudeUnits,
                options.numberFormat,
            );
        },
        dateFormatter() {
            return createDateFormatter(this.getUser().options.dateTimeFormat);
        },
        distanceFormatter() {
            const options = this.getUser().options;
            return createDistanceFormatter(
                options.altitudeUnits,
                this.numberFormatter(),
            );
        },
        numberFormatter() {
            return createNumberFormatter(this.getUser().options.numberFormat);
        },
        speedFormatter() {
            const options = this.getUser().options;
            return createSpeedFormatter(
                options.speedUnits,
                options.numberFormat,
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

const PUBLIC_PATHS = [
    routes.home.route,
    routes.auth.login.route,
    routes.auth.register.route,
    routes.demo.try.route,
    routes.about.route,
    routes.privacy.route,
    routes.todo.route,
];
const PUBLIC_ASSET_PREFIX = "/assets/";
const PUBLIC_ROOT_ASSETS = new Set([
    "/favicon.ico",
    "/icon.png",
    "/icon-192.png",
    "/icon-512.png",
    "/og-image.png",
    "/apple-72x72.png",
    "/apple-144x144.png",
    "/logo.svg",
    "/manifest.json",
]);

function isPublicAssetPath(path: string) {
    return path.startsWith(PUBLIC_ASSET_PREFIX) || PUBLIC_ROOT_ASSETS.has(path);
}

function basicAuthChallenge(c: AppRequestContext) {
    return c.body("Invalid username or password", 401, {
        "WWW-Authenticate": 'Basic realm="Loki - Skydiving Logbook"',
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

    if (isPublicAssetPath(path)) {
        return next();
    }

    const ctx = getAppContext(c);

    if (Math.random() < 0.1) {
        const now = Math.floor(Date.now() / 1000);
        await ctx.db.delete(sessions).where(lte(sessions.expiresAt, now)).run();
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
            const { expiresAt, sessionLastUsedAt, userLastUsedAt, ...userRow } =
                row;
            void expiresAt;
            ctx.user = new User(ctx.db, userRow);
            // Throttle last-used writes to once per 5 minutes
            if (sessionLastUsedAt <= now - 5 * 60) {
                await ctx.db
                    .update(sessions)
                    .set({ lastUsedAt: now, expiresAt: now + SESSION_MAX_AGE })
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

    if (ctx.isSelfHosted() && path === routes.home.route) {
        return c.redirect(routes.auth.login({}));
    }

    if (
        !ctx.user &&
        path !== routes.auth.register.route &&
        path !== routes.about.route &&
        path !== routes.privacy.route &&
        path !== routes.demo.try.route &&
        !(await hasRegisteredUsers(ctx.db))
    ) {
        return c.redirect(routes.auth.register({}));
    }

    const isPublicPath = PUBLIC_PATHS.some((publicPath) => publicPath === path);
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
        !ctx.user ||
        ctx.user.options.privacyPolicyAccepted ||
        PRIVACY_POLICY_ALLOWED_PATHS.has(c.req.path)
    ) {
        return next();
    }

    const url = ctx.url();
    return c.redirect(routes.privacy({}, { back: url.pathname + url.search }));
}

app.use("*", privacyPolicyMiddleware);

app.use("*", readonlyMiddleware);

app.use("*", htmlCacheMiddleware);

const READONLY_ALLOWED_POST_PATHS = new Set<string>([
    routes.auth.logout.route,
    routes.demo.try.route,
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
            ? `${user.getDisplayName()} – Loki - Skydiving Logbook`
            : "Loki - Skydiving Logbook";

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
                    <link rel="icon" href="/logo.svg" type="image/svg+xml" />
                    <link rel="manifest" href="/manifest.json" />
                    <meta name="theme-color" content="#4f46e5" />
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
