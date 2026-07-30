import { Context, Hono, type Handler } from "hono";
import { TrieRouter } from "hono/router/trie-router";
import { useRequestContext as useHonoRequestContext } from "hono/jsx-renderer";
import type { Child, FC } from "hono/jsx";
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
import { registerRequestContext } from "@/core/middleware/request-context";
import { registerAuthentication } from "@/core/middleware/authentication";
import { registerPolicies } from "@/core/middleware/policies";
import { registerRenderer } from "@/core/middleware/renderer";
import {
    isRegisteredRoute,
    registerRoute,
    type RegisteredMethod,
    type RegisteredRoute,
} from "@/core/register-route";

export { User } from "@/core/user";

/** Describes create app router options. */
export interface CreateAppRouterOptions {
    name: string;
    title: string;
    repositoryUrl: string;
    description: string;
    basicAuthRealm: string;
    authenticatedHome: string;
    logoPath: string;
    themeColor: string;
    socialImagePath: string;
    socialImageAlt: string;
    render: (props: AppRouterRenderProps) => Exclude<ReturnType<FC>, null>;
    /** Enables hosted privacy-policy routes and acceptance with this content. */
    privacyPolicyContent?: FC;
    afterUserCreated?: (
        context: RequestContext,
        userUuid: string,
        appFormValues: Readonly<Record<string, string>>,
    ) => Promise<void>;
    beforeUserDeleted?: (
        context: RequestContext,
        userUuid: string,
    ) => Promise<void>;
    validatePreferencesForm?: (
        formValues: Readonly<Record<string, string>>,
    ) => string[];
    savePreferencesForm?: (
        context: RequestContext,
        formValues: Readonly<Record<string, string>>,
    ) => Promise<void>;
}

/** Describes app router render props. */
export interface AppRouterRenderProps {
    children: Child;
}

/** Registers a typed route and its access metadata on the application router. */
type AppRouteHandler = <Path extends string>(
    route: RegisteredRoute<Path>,
    handler: Handler<Env, NoInfer<Path>>,
) => AppRouter;

/** Returns whether a runtime value can be invoked as a Hono handler. */
function isHandler(value: unknown): value is Handler<Env> {
    return typeof value === "function";
}

/** Provides app router behavior. */
export class AppRouter extends Hono<Env> {
    override get = this.createRouteMethod("get");
    override post = this.createRouteMethod("post");
    override put = this.createRouteMethod("put");
    override delete = this.createRouteMethod("delete");
    override patch = this.createRouteMethod("patch");

    /** Creates a router configured with the concrete application options. */
    constructor(readonly appOptions: CreateAppRouterOptions) {
        // The trie router remains mutable during Vite module reloads.
        super({ router: new TrieRouter() });
    }

    /** Wraps a Hono method so typed routes also register access metadata. */
    private createRouteMethod<M extends RegisteredMethod>(
        method: M,
    ): Hono<Env>[M] & AppRouteHandler;
    /** Implements typed route registration and delegates untyped calls to Hono. */
    private createRouteMethod(method: RegisteredMethod): unknown {
        const honoMethod = this[method];
        return (...registration: readonly unknown[]) => {
            const [route, handler] = registration;
            if (isRegisteredRoute(route)) {
                if (!isHandler(handler)) {
                    throw new TypeError("Expected a typed route and handler");
                }
                registerRoute(this, method, route, handler);
                return this;
            }
            return Reflect.apply(honoMethod, this, registration);
        };
    }
}

/** Hono context configured with the core environment. */
export type HonoRequestContext = Context<Env>;

/** Describes request context options. */
interface RequestContextOptions {
    appRouter: AppRouter;
    db: AppDatabase;
    honoContext: HonoRequestContext;
    serverTimings: ServerTimings;
    sqlitePath?: string;
}

/** Provides request context behavior. */
export class RequestContext {
    readonly appRouter: AppRouter;
    readonly db: AppDatabase;
    readonly sqlitePath: string | undefined;
    user: User | null = null;
    readonly honoContext: HonoRequestContext;
    readonly cssDupCache = new Set<string>();
    readonly jsDupCache = new Set<object>();
    readonly serverTimings: ServerTimings;

    /** Creates a request context from the router, database, and runtime context. */
    constructor(options: RequestContextOptions) {
        this.appRouter = options.appRouter;
        this.db = options.db;
        this.sqlitePath = options.sqlitePath;
        this.honoContext = options.honoContext;
        this.serverTimings = options.serverTimings;
    }

    /** Returns the concrete application's router options. */
    get appOptions(): CreateAppRouterOptions {
        return this.appRouter.appOptions;
    }

    /** Returns the authenticated user or throws when authentication is absent. */
    getUser(): User {
        if (!this.user) {
            throw new Error("No user set in context");
        }
        return this.user;
    }

    /** Returns a duration formatter configured for the authenticated user. */
    calendarDurationFormatter(): CalendarDurationFormatter {
        return createCalendarDurationFormatter(this.numberFormatter());
    }

    /** Returns a date formatter configured for the authenticated user. */
    dateFormatter(): DateFormatter {
        return createDateFormatter(this.getUser().options.dateTimeFormat);
    }

    /** Returns a number formatter configured for the authenticated user. */
    numberFormatter(): NumberFormatter {
        return createNumberFormatter(this.getUser().options.numberFormat);
    }

    /** Returns whether the request is served by the self-hosted runtime. */
    isSelfHosted(): boolean {
        return Boolean(this.sqlitePath);
    }

    /** Returns the validated request URL supplied by the runtime. */
    url(): URL {
        // Use the request URL as provided by the runtime (Cloudflare validates
        // Host). Do not rebuild from the Host header.
        return new URL(this.honoContext.req.url);
    }
}

/** Request-scoped variables exposed through Hono. */
export interface Variables {
    requestContext: RequestContext;
}

/** Bindings for Cloudflare Workers (D1) and optional Node self-host override. */
export interface AppBindings extends CloudflareBindings {
    /** Build a request-scoped Drizzle client for Node/self-host. */
    APP_DB_FACTORY?: (timings: ServerTimings) => AppDatabase;
    /** Absolute database path exposed by the self-contained Node binary. */
    APP_SQLITE_PATH?: string;
}

/** Hono environment containing application bindings and request variables. */
export interface Env {
    Bindings: AppBindings;
    Variables: Variables;
}

/** Returns request context. */
export function getRequestContext(c: HonoRequestContext): RequestContext {
    if (!c.var.requestContext) {
        throw new Error("Request context not set in Hono request context");
    }
    return c.var.requestContext;
}

/** Returns request context. */
export function useRequestContext(): RequestContext {
    const c = useHonoRequestContext<Env>();
    return getRequestContext(c);
}

/** Returns calendar duration formatter. */
export function useCalendarDurationFormatter(): CalendarDurationFormatter {
    return useRequestContext().calendarDurationFormatter();
}

/** Returns date formatter. */
export function useDateFormatter(): DateFormatter {
    return useRequestContext().dateFormatter();
}

/** Returns number formatter. */
export function useNumberFormatter(): NumberFormatter {
    return useRequestContext().numberFormatter();
}

/** Creates app router. */
export function createAppRouter(options: CreateAppRouterOptions): AppRouter {
    const router = new AppRouter(options);
    registerErrorHandlers(router);
    registerRequestContext(router);
    registerAuthentication(router);
    registerPolicies(router);
    registerRenderer(router);
    return router;
}
