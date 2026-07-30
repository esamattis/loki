import clsx from "clsx";
import { ChevronRightIcon } from "@/core/components/icons";

/**
 * Styled `<details>` with a chevron that rotates when open.
 *
 * @param props.summary - Summary row content (label).
 * @param props.open - Initial open state.
 * @param props.className - Classes on the `<details>` element.
 * @param props.summaryClassName - Classes on the `<summary>` element.
 * @param props.children - Collapsible body.
 */
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
