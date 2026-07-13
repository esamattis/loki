import clsx from "clsx";
import type { Child } from "hono/jsx";

export function ErrorList(props: { errors: Child[]; className?: string }) {
    if (props.errors.length === 0) {
        return null;
    }

    return (
        <div className={clsx("rounded-lg p-3 text-sm", props.className)}>
            {props.errors.map((error, index) => (
                <p key={index}>{error}</p>
            ))}
        </div>
    );
}
