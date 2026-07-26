import { Context, Hono } from "hono";
import { TrieRouter } from "hono/router/trie-router";
import { useRequestContext } from "hono/jsx-renderer";
import type { Child } from "hono/jsx";
import type { AppDatabase } from "@/core/db";
import { User } from "@/core/user";
import type { ServerTimings } from "@/core/server-timing";
import {
    createCalendarDurationFormatter,
    createDateFormatter,
    createNumberFormatter,
    type CalendarDurationFormatter,
    type DateFormatter,
    type NumberFormatter,
} from "@/core/format";
import { registerErrorHandlers } from "@/core/error-handlers";
import { registerAppContext } from "@/core/middleware/app-context";
import { registerAuthentication } from "@/core/middleware/authentication";
import { registerPolicies } from "@/core/middleware/policies";
import { registerRenderer } from "@/core/middleware/renderer";

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

export class App extends Hono<Env> {
    constructor(readonly appOptions: CreateAppOptions) {
        // The trie router remains mutable during Vite module reloads.
        super({ router: new TrieRouter() });
    }
}

export type AppRequestContext = Context<Env>;

interface AppContextOptions {
    app: App;
    db: AppDatabase;
    requestContext: AppRequestContext;
    serverTimings: ServerTimings;
    sqlitePath?: string;
}

export class AppContext {
    readonly app: App;
    readonly db: AppDatabase;
    readonly sqlitePath: string | undefined;
    user: User | null = null;
    readonly requestContext: AppRequestContext;
    readonly cssDupCache = new Set<string>();
    readonly jsDupCache = new Set<object>();
    readonly serverTimings: ServerTimings;
    readonly appOptions: CreateAppOptions;

    constructor(options: AppContextOptions) {
        this.app = options.app;
        this.db = options.db;
        this.sqlitePath = options.sqlitePath;
        this.requestContext = options.requestContext;
        this.serverTimings = options.serverTimings;
        this.appOptions = options.app.appOptions;
    }

    getUser(): User {
        if (!this.user) {
            throw new Error("No user set in context");
        }
        return this.user;
    }

    calendarDurationFormatter(): CalendarDurationFormatter {
        return createCalendarDurationFormatter(this.numberFormatter());
    }

    dateFormatter(): DateFormatter {
        return createDateFormatter(this.getUser().options.dateTimeFormat);
    }

    numberFormatter(): NumberFormatter {
        return createNumberFormatter(this.getUser().options.numberFormat);
    }

    isSelfHosted(): boolean {
        return Boolean(this.sqlitePath);
    }

    url(): URL {
        // Use the request URL as provided by the runtime (Cloudflare validates
        // Host). Do not rebuild from the Host header.
        return new URL(this.requestContext.req.url);
    }
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
    const app = new App(options);
    registerErrorHandlers(app);
    registerAppContext(app);
    registerAuthentication(app);
    registerPolicies(app);
    registerRenderer(app);
    return app;
}
