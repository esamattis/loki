import type { Child } from "hono/jsx";

export function SingleNumberCard(props: {
    label: string;
    value: string;
    description?: string;
    footer?: Child;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {props.label}
            </dt>
            <dd className="mt-2 text-4xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
                {props.value}
            </dd>
            {props.description && (
                <dd className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {props.description}
                </dd>
            )}
            {props.footer && (
                <dd className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    {props.footer}
                </dd>
            )}
        </div>
    );
}
