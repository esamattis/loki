import type { Child } from "hono/jsx";
import { Link } from "@/core/components/link";

export function SecondaryActionLink(props: {
    href: string;
    icon?: Child;
    children: Child;
}) {
    return (
        <Link
            href={props.href}
            className="inline-flex items-center gap-1.5 text-sm"
        >
            {props.icon}
            {props.children}
        </Link>
    );
}
