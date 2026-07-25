import clsx from "clsx";
import type { Child } from "hono/jsx";

export function SectionHeader(props: {
    icon: Child;
    iconClassName: string;
    title: string;
    description: Child;
    children?: Child;
}) {
    return (
        <div className="flex items-start gap-3">
            <span
                aria-hidden="true"
                className={clsx(
                    "mt-1 flex h-10 w-10 flex-none items-center justify-center rounded-xl",
                    props.iconClassName,
                )}
            >
                {props.icon}
            </span>
            <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {props.title}
                </h2>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {props.description}
                </div>
                {props.children}
            </div>
        </div>
    );
}
