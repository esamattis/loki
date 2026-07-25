import clsx from "clsx";
import { Select } from "@/components/form";
import { ConfirmDangerButton } from "@/components/ui/confirm-danger-button";

export function MergeIntoForm(props: {
    options: { uuid: string; name: string }[];
    description: string;
    selectLabel: string;
    buttonLabel?: string;
    className?: string;
}) {
    if (props.options.length === 0) {
        return null;
    }
    const buttonLabel = props.buttonLabel ?? "Merge";
    return (
        <form
            method="post"
            className={clsx(
                "mb-4 space-y-3 border-b border-red-200 pb-4 dark:border-red-900/60",
                props.className,
            )}
        >
            <input type="hidden" name="action" value="merge" />
            <p className="text-sm text-red-700/90 dark:text-red-300/90">
                {props.description}
            </p>
            <Select name="targetUuid" label={props.selectLabel} required>
                <option value="">Select…</option>
                {props.options.map((option) => (
                    <option value={option.uuid}>{option.name}</option>
                ))}
            </Select>
            <ConfirmDangerButton
                label={buttonLabel}
                confirmLabel="Confirm merge"
            />
        </form>
    );
}
