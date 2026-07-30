import clsx from "clsx";
import type { Child } from "hono/jsx";

/**
 * Renders a list of validation or form errors. Returns null when `errors` is empty.
 *
 * @param props.errors - Error messages or nodes to show, one per paragraph.
 * @param props.className - Optional classes on the outer container.
 */
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
