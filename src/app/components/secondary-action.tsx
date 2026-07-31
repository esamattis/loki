import clsx from "clsx";
import type { Child } from "hono/jsx";
import { Link, linkClassName } from "@/core/components/link";

const secondaryActionClassName = "inline-flex items-center gap-1.5 text-sm";

export function SecondaryAction(props: {
    href?: string;
    id?: string;
    icon?: Child;
    "data-loki-tooltip"?: string;
    children: Child;
}) {
    if (props.href) {
        return (
            <Link
                href={props.href}
                data-loki-tooltip={props["data-loki-tooltip"]}
                className={secondaryActionClassName}
            >
                {props.icon}
                {props.children}
            </Link>
        );
    }

    return (
        <button
            type="button"
            id={props.id}
            data-loki-tooltip={props["data-loki-tooltip"]}
            className={clsx(linkClassName, secondaryActionClassName)}
        >
            {props.icon}
            {props.children}
        </button>
    );
}
