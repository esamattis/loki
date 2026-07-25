import clsx from "clsx";
import { ConfirmDangerButton } from "@/components/ui/confirm-danger-button";

export function ConfirmDeleteButton(props: {
    label: string;
    className?: string;
    action?: string;
}) {
    return (
        <form method="post" className={clsx("flex", props.className)}>
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
