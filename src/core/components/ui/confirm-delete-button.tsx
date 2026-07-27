import clsx from "clsx";
import { ConfirmDangerButton } from "@/core/components/ui/confirm-danger-button";

/**
 * Standalone POST form with a two-step danger button that submits
 * `action` (default `"delete"`). Prefer embedding `ConfirmDangerButton` when
 * the control must live inside an existing form.
 *
 * @param props.label - Initial button label before confirmation.
 * @param props.className - Classes on the wrapping form.
 * @param props.action - Hidden `action` field value; defaults to `"delete"`.
 * @param props.formAction - Optional form `action` URL override.
 */
export function ConfirmDeleteButton(props: {
    label: string;
    className?: string;
    action?: string;
    formAction?: string;
}) {
    return (
        <form
            method="post"
            action={props.formAction}
            className={clsx("flex", props.className)}
        >
            <input
                type="hidden"
                name="action"
                value={props.action ?? "delete"}
            />
            <ConfirmDangerButton
                label={props.label}
                confirmLabel="Confirm delete"
            />
        </form>
    );
}
