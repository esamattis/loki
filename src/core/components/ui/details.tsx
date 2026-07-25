import clsx from "clsx";
import { ChevronRightIcon } from "@/core/components/icons";

export function Details(props: {
    summary: any;
    open?: boolean;
    className?: string;
    summaryClassName?: string;
    children: any;
}) {
    return (
        <details open={props.open} className={clsx("group", props.className)}>
            <summary
                className={clsx(
                    "flex cursor-pointer list-none items-center gap-2 marker:hidden",
                    props.summaryClassName,
                )}
            >
                <ChevronRightIcon className="h-4 w-4 flex-none text-slate-400 transition-transform group-open:rotate-90 dark:text-slate-500" />
                {props.summary}
            </summary>
            {props.children}
        </details>
    );
}
