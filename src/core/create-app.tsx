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

export class AppRouter extends Hono<Env> {
    override get = this.createRouteMethod("get");
    override post = this.createRouteMethod("post");
    override put = this.createRouteMethod("put");
    override delete = this.createRouteMethod("delete");
    override patch = this.createRouteMethod("patch");

    constructor(readonly appOptions: CreateAppRouterOptions) {
        // The trie router remains mutable during Vite module reloads.
        super({ router: new TrieRouter() });
    }

    /** Wraps a Hono method so typed routes also register access metadata. */
    private createRouteMethod<M extends RegisteredMethod>(
        method: M,
    ): Hono<Env>[M] & AppRouteHandler;
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

export type HonoRequestContext = Context<Env>;

interface RequestContextOptions {
    appRouter: AppRouter;
    db: AppDatabase;
    honoContext: HonoRequestContext;
    serverTimings: ServerTimings;
    sqlitePath?: string;
}

export class RequestContext {
    readonly appRouter: AppRouter;
    readonly db: AppDatabase;
    readonly sqlitePath: string | undefined;
    user: User | null = null;
    readonly honoContext: HonoRequestContext;
    readonly cssDupCache = new Set<string>();
    readonly jsDupCache = new Set<object>();
    readonly serverTimings: ServerTimings;

    constructor(options: RequestContextOptions) {
        this.appRouter = options.appRouter;
        this.db = options.db;
        this.sqlitePath = options.sqlitePath;
        this.honoContext = options.honoContext;
        this.serverTimings = options.serverTimings;
    }

    get appOptions(): CreateAppRouterOptions {
        return this.appRouter.appOptions;
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
        return new URL(this.honoContext.req.url);
    }
}

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

export interface Env {
    Bindings: AppBindings;
    Variables: Variables;
}

export function getRequestContext(c: HonoRequestContext): RequestContext {
    if (!c.var.requestContext) {
        throw new Error("Request context not set in Hono request context");
    }
    return c.var.requestContext;
}

export function useRequestContext(): RequestContext {
    const c = useHonoRequestContext<Env>();
    return getRequestContext(c);
}

export function useCalendarDurationFormatter(): CalendarDurationFormatter {
    return useRequestContext().calendarDurationFormatter();
}

export function useDateFormatter(): DateFormatter {
    return useRequestContext().dateFormatter();
}

export function useNumberFormatter(): NumberFormatter {
    return useRequestContext().numberFormatter();
}

export function createAppRouter(options: CreateAppRouterOptions): AppRouter {
    const router = new AppRouter(options);
    registerErrorHandlers(router);
    registerRequestContext(router);
    registerAuthentication(router);
    registerPolicies(router);
    registerRenderer(router);
    return router;
}
