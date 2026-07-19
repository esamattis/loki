import clsx from "clsx";
import { Details } from "@/components/ui/details";

export function DangerZone(props: {
    children: any;
    label?: string;
    className?: string;
}) {
    return (
        <Details
            className={clsx(
                "mt-6 rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/60 dark:bg-red-950/20",
                props.className,
            )}
            summary={
                <span>
                    <span className="block text-sm font-medium text-red-700 dark:text-red-300">
                        {props.label ?? "Danger Zone"}
                    </span>
                    <span className="block text-xs text-red-600 dark:text-red-400">
                        Show destructive actions
                    </span>
                </span>
            }
        >
            <div className="ml-6 mt-3">{props.children}</div>
        </Details>
    );
}
