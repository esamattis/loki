import type { Child } from "hono/jsx";

const secondaryActionClassName =
    "inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-slate-600 transition hover:text-indigo-600 hover:underline focus:outline-none focus-visible:text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500/40 dark:text-slate-400 dark:hover:text-indigo-400 dark:focus-visible:text-indigo-400 dark:focus-visible:ring-indigo-400/40";

export function SecondaryAction(props: {
    href?: string;
    id?: string;
    icon?: Child;
    "data-loki-tooltip"?: string;
    children: Child;
}) {
    if (props.href) {
        return (
            <a
                href={props.href}
                data-loki-tooltip={props["data-loki-tooltip"]}
                className={secondaryActionClassName}
            >
                {props.icon}
                {props.children}
            </a>
        );
    }

    return (
        <button
            type="button"
            id={props.id}
            data-loki-tooltip={props["data-loki-tooltip"]}
            className={secondaryActionClassName}
        >
            {props.icon}
            {props.children}
        </button>
    );
}
