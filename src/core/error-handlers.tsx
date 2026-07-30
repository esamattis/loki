import type { AppRouter, HonoRequestContext } from "@/core/create-app";
import { getRequestContext } from "@/core/create-app";

/** Renders unexpected errors while preserving Hono HTTP exceptions. */
function errorHandler(err: Error, c: HonoRequestContext) {
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

/** Renders the core not-found response. */
function notFoundHandler(c: HonoRequestContext) {
    if (c.req.path.includes("__")) {
        return c.body("Not found", 404, { "Content-Type": "text/plain" });
    }

    const options = getRequestContext(c).appOptions;
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

/** Registers error handlers. */
export function registerErrorHandlers(app: AppRouter): void {
    app.onError(errorHandler);
    app.notFound(notFoundHandler);
}
