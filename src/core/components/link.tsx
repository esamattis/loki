import clsx from "clsx";
import type { Child } from "hono/jsx";

/** Shared Tailwind classes for inline text links. */
export const linkClassName =
    "font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-700 dark:text-indigo-400 dark:decoration-indigo-700 dark:hover:text-indigo-300";

/**
 * Same-origin text link with default link styling.
 *
 * @param props.href - Destination URL.
 * @param props.className - Extra classes merged with `linkClassName`.
 * @param props["aria-label"] - Accessible name when children are not descriptive.
 * @param props["data-loki-tooltip"] - Tooltip text for the global tooltip system.
 * @param props.children - Link content.
 */
export function Link(props: {
    href: string;
    className?: string;
    "aria-label"?: string;
    "data-loki-tooltip"?: string;
    children: Child;
}) {
    return (
        <a
            href={props.href}
            aria-label={props["aria-label"]}
            data-loki-tooltip={props["data-loki-tooltip"]}
            className={clsx(linkClassName, props.className)}
        >
            {props.children}
        </a>
    );
}

/**
 * External text link that opens in a new tab with `rel="noopener noreferrer"`.
 *
 * @param props.href - Destination URL.
 * @param props.className - Extra classes merged with `linkClassName`.
 * @param props["aria-label"] - Accessible name when children are not descriptive.
 * @param props["data-loki-tooltip"] - Tooltip text for the global tooltip system.
 * @param props.children - Link content.
 */
export function ExternalLink(props: {
    href: string;
    className?: string;
    "aria-label"?: string;
    "data-loki-tooltip"?: string;
    children: Child;
}) {
    return (
        <a
            href={props.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={props["aria-label"]}
            data-loki-tooltip={props["data-loki-tooltip"]}
            className={clsx(linkClassName, props.className)}
        >
            {props.children}
        </a>
    );
}
