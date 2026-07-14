import { Context, Hono } from "hono";
import { TrieRouter } from "hono/router/trie-router";
import { eq, lte } from "drizzle-orm";
import { jsxRenderer, useRequestContext } from "hono/jsx-renderer";
import { deleteCookie, getCookie } from "hono/cookie";
import { ViteClient } from "vite-ssr-components/hono";
import htmx from "htmx.org/dist/htmx.esm.js?raw";
import tailwind from "./tailwind.css?inline";
import { Script } from "./components/helpers";
import { Button } from "./components/form";
import { Dialog } from "./components/ui";
import { sessions, users } from "./schema";
import * as routes from "./routes";
import { parseUserOptions, type UserOptions } from "./options";
import {
    findUserForAuth,
    hashToken,
    isSafeRedirectPath,
    parseBasicAuth,
    SESSION_COOKIE_NAME,
    sessionCookieOptions,
    type AuthenticatedUser,
} from "./auth";
import { createD1Database, type AppDatabase } from "./db";
import { $assertElement } from "./utils";

export type AppType = Hono<Env>;

export type AppRequestContext = Context<Env>;

export interface AppContext {
    db: AppDatabase;
    user: User | null;
    getUser(): User;
    requestContext: AppRequestContext;
    cssDupCache: Set<string>;
    jsDupCache: Set<(...args: any[]) => any>;
    url(): URL;
}

export interface User {
    username: string;
    uuid: string;
    displayName: string | null;
    email: string;
    options: UserOptions;
    admin: boolean;
    getDisplayName(): string;
}

export interface Variables {
    appContext: AppContext;
}

/** Bindings for Cloudflare Workers (D1) and optional Node self-host override. */
export interface AppBindings extends CloudflareBindings {
    /** Pre-built Drizzle client for Node/self-host. When set, DB is unused. */
    APP_DB?: AppDatabase;
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

app.get(routes.tailwindCss.route, (c) => {
    return c.body(tailwind, 200, {
        "Content-Type": "text/css; charset=utf-8",
    });
});

app.get(routes.htmxScript.route, (c) => {
    return c.body(htmx, 200, {
        "Content-Type": "text/javascript; charset=utf-8",
    });
});

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

function $restoreFormScrollPosition() {
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

function $showNavigationProgress(options: {
    mode: "form" | "link";
    method?: string;
}) {
    if (document.getElementById("form-submit-progress")) {
        return;
    }

    const isPost =
        options.mode === "form" &&
        (options.method ?? "get").toLowerCase() === "post";

    const progress = document.createElement("div");
    progress.id = "form-submit-progress";
    progress.setAttribute("role", "progressbar");
    if (isPost) {
        progress.classList.add("form-submit-progress-post");
    }
    progress.setAttribute(
        "aria-label",
        options.mode === "form" ? "Submitting form" : "Loading page",
    );
    progress.setAttribute(
        "aria-valuetext",
        options.mode === "form" ? "Submitting" : "Loading",
    );
    document.body.appendChild(progress);
}

function $disableFormOnSubmit() {
    document.addEventListener("submit", (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) {
            return;
        }

        form.setAttribute("aria-busy", "true");
        form.classList.add(
            "opacity-60",
            "cursor-not-allowed",
            "pointer-events-none",
            "select-none",
        );

        $showNavigationProgress({
            mode: "form",
            method: form.method,
        });

        const submitter = event.submitter;
        if (submitter instanceof HTMLButtonElement) {
            submitter.classList.add("form-submit-pending");
            if (!submitter.querySelector(".form-submit-spinner")) {
                const spinner = document.createElement("span");
                spinner.className = "form-submit-spinner";
                spinner.setAttribute("aria-hidden", "true");
                submitter.insertBefore(spinner, submitter.firstChild);
            }
        }

        // Disable after the browser builds the form data set so values still submit.
        setTimeout(() => {
            for (const element of form.elements) {
                if (
                    element instanceof HTMLInputElement ||
                    element instanceof HTMLButtonElement ||
                    element instanceof HTMLSelectElement ||
                    element instanceof HTMLTextAreaElement
                ) {
                    element.disabled = true;
                }
            }
        }, 0);
    });
}

function $showProgressOnLinkClick() {
    document.addEventListener("click", (event) => {
        if (event.defaultPrevented) {
            return;
        }
        if (event.button !== 0) {
            return;
        }
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }

        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        const anchor = target.closest("a");
        if (!(anchor instanceof HTMLAnchorElement)) {
            return;
        }

        if (!anchor.href) {
            return;
        }
        if (anchor.hasAttribute("download")) {
            return;
        }
        if (anchor.target && anchor.target !== "_self") {
            return;
        }

        let url: URL;
        try {
            url = new URL(anchor.href, window.location.href);
        } catch {
            return;
        }

        if (url.origin !== window.location.origin) {
            return;
        }
        if (
            url.pathname === window.location.pathname &&
            url.search === window.location.search &&
            url.hash !== ""
        ) {
            return;
        }
        if (url.protocol !== "http:" && url.protocol !== "https:") {
            return;
        }

        $showNavigationProgress({ mode: "link" });
    });
}

const UNSAVED_CHANGES_DIALOG_ID = "unsaved-changes-dialog";

function $isFormDirty(): boolean {
    return document.documentElement.dataset.formDirty === "true";
}

function $clearFormDirty(): void {
    delete document.documentElement.dataset.formDirty;
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
    document.documentElement.dataset.formDirty = "true";
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

function $guardUnsavedFormChanges(dialogId: string) {
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

    const dialog = document.getElementById(dialogId);
    $assertElement(dialog, HTMLDialogElement);

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

function UnsavedChangesDialog() {
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

function $applyStoredTheme() {
    try {
        let theme = localStorage.getItem("theme");
        if (theme !== "light" && theme !== "dark") {
            theme = "system";
        }
        const isDark =
            theme === "dark" ||
            (theme === "system" &&
                matchMedia("(prefers-color-scheme: dark)").matches);
        document.documentElement.classList.toggle("dark", isDark);
        document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    } catch {
        // ignore
    }
}

function $disableViewTransitionsInAutomation() {
    // Playwright/automation leaves view-transition snapshots that never
    // settle for hit-testing; opt out so e2e clicks stay reliable.
    if (!navigator.webdriver) {
        return;
    }
    const style = document.createElement("style");
    style.textContent = "@view-transition { navigation: none; }";
    document.head.appendChild(style);
}

function $registerServiceWorker(workerUrl: string) {
    if (!("serviceWorker" in navigator)) {
        return;
    }
    navigator.serviceWorker.register(workerUrl).catch(() => {
        // ignore registration failures
    });
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
                href={routes.logbook({})}
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
    c.set("appContext", {
        db: c.env.APP_DB ?? createD1Database(c.env.DB),
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
        url() {
            // Use the request URL as provided by the runtime (Cloudflare
            // validates Host). Do not rebuild from the Host header.
            return new URL(c.req.url);
        },
    });
    await next();
}

app.use("*", setAppContextMiddleware);

const PUBLIC_PATHS = [routes.login.route, routes.register.route];
const PUBLIC_ASSET_PREFIX = "/assets/";
const PUBLIC_ROOT_ASSETS = new Set([
    "/favicon.ico",
    "/icon.png",
    "/icon-192.png",
    "/icon-512.png",
    "/apple-72x72.png",
    "/apple-144x144.png",
    "/logo.svg",
    "/manifest.json",
    "/sw.js",
]);

function isPublicAssetPath(path: string) {
    return path.startsWith(PUBLIC_ASSET_PREFIX) || PUBLIC_ROOT_ASSETS.has(path);
}

function setAuthenticatedUser(ctx: AppContext, user: AuthenticatedUser) {
    ctx.user = {
        uuid: user.uuid,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        options: parseUserOptions(user.options),
        admin: user.admin,
        getDisplayName() {
            return user.displayName || user.username;
        },
    };
}

function basicAuthChallenge(c: AppRequestContext) {
    return c.body("Invalid username or password", 401, {
        "WWW-Authenticate": 'Basic realm="Jump Logbook"',
        "Content-Type": "text/plain; charset=utf-8",
    });
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
                expiresAt: sessions.expiresAt,
                lastUsedAt: sessions.lastUsedAt,
            })
            .from(sessions)
            .innerJoin(users, eq(sessions.userUuid, users.uuid))
            .where(eq(sessions.tokenHash, tokenHash))
            .limit(1)
            .get();

        if (row && row.expiresAt > now) {
            const { expiresAt, lastUsedAt, ...userRow } = row;
            void expiresAt;
            setAuthenticatedUser(ctx, userRow);
            // Throttle last-used writes to once per 5 minutes
            if (lastUsedAt <= now - 5 * 60) {
                await ctx.db
                    .update(sessions)
                    .set({ lastUsedAt: now })
                    .where(eq(sessions.tokenHash, tokenHash))
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
                setAuthenticatedUser(ctx, user);
            }
        }

        if (!ctx.user) {
            if (authorization) {
                return basicAuthChallenge(c);
            }
            const loginUrl = isSafeRedirectPath(path)
                ? routes.login({}, { back: path })
                : routes.login({});
            return c.redirect(loginUrl);
        }
    }

    await next();
}

app.use("*", authenticateMiddleware);

app.use(
    "*",
    jsxRenderer((props, c) => {
        // fragment for htmx
        if (c.req.path.includes("__")) {
            return <>{props.children}</>;
        }

        const user = getAppContext(c).user;

        const title = user
            ? `${user.getDisplayName()} – Jump Logbook`
            : "Jump Logbook";

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
                    <Script $exec={$applyStoredTheme} />
                    <Script
                        $args={[routes.serviceWorker({})]}
                        $exec={$registerServiceWorker}
                    />
                    <link href={routes.tailwindCss({})} rel="stylesheet" />
                    {/* After CSS so automation can override @view-transition. */}
                    <Script $exec={$disableViewTransitionsInAutomation} />
                    <script src={routes.htmxScript({})} type="module"></script>
                </head>
                <body
                    style={{
                        ["--animation-duration"]: "5000ms",
                    }}
                    className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-200"
                >
                    <div className="min-h-screen">{props.children}</div>
                    <UnsavedChangesDialog />
                    <Script
                        $deps={[
                            $assertElement,
                            $isFormDirty,
                            $clearFormDirty,
                            $markFormDirtyFromEvent,
                            $navigationHrefFromClick,
                        ]}
                        $args={[UNSAVED_CHANGES_DIALOG_ID]}
                        $exec={$guardUnsavedFormChanges}
                    />
                    <Script $exec={$restoreFormScrollPosition} />
                    <Script
                        $deps={[$showNavigationProgress]}
                        $exec={$disableFormOnSubmit}
                    />
                    <Script
                        $deps={[$showNavigationProgress]}
                        $exec={$showProgressOnLinkClick}
                    />
                </body>
            </html>
        );
    }),
);
