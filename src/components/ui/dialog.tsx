import clsx from "clsx";
import { useId, type Child } from "hono/jsx";
import { $assertElement } from "@/utils";
import { Script } from "@/components/script";

function $initDialog(dialogId: string, openButtonId: string) {
    const dialog = document.getElementById(dialogId);
    $assertElement(dialog, HTMLDialogElement);
    if (openButtonId !== "") {
        const openButton = document.getElementById(openButtonId);
        $assertElement(openButton, HTMLButtonElement);
        openButton.addEventListener("click", () => dialog.showModal());
    }
    dialog.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target === dialog) dialog.close();
        if (target instanceof HTMLButtonElement && target.value === "cancel")
            dialog.close();
    });
}

function DialogScript(props: { dialogId: string; openButtonId: string }) {
    return (
        <Script
            $deps={[$assertElement]}
            $args={[props.dialogId, props.openButtonId]}
            $exec={$initDialog}
        />
    );
}

export function Dialog(props: {
    id?: string;
    openButtonId?: string;
    title: string;
    description?: Child;
    children: Child;
    className?: string;
    contentClassName?: string;
}) {
    const generatedId = useId();
    const dialogId = props.id ?? generatedId;
    return (
        <>
            <dialog
                id={dialogId}
                className={clsx(
                    "m-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
                    props.className,
                )}
            >
                <div className={clsx("space-y-4 p-5", props.contentClassName)}>
                    <div className="flex items-start justify-between gap-3">
                        <h2 className="text-base font-semibold">
                            {props.title}
                        </h2>
                        <button
                            type="button"
                            value="cancel"
                            className="rounded-lg px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                            Close
                        </button>
                    </div>
                    {props.description ? (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {props.description}
                        </p>
                    ) : null}
                    {props.children}
                </div>
            </dialog>
            <DialogScript
                dialogId={dialogId}
                openButtonId={props.openButtonId ?? ""}
            />
        </>
    );
}
