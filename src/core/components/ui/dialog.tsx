import clsx from "clsx";
import { useId, type Child } from "hono/jsx";
import { $select } from "@/core/utils";
import { Script } from "@/core/components/script";

/**
 * Opens the dialog from an optional button, closes on backdrop click or a
 * button with `value="cancel"`.
 */
function $initDialog(dialogId: string, openButtonId: string) {
    const dialog = $select.id(dialogId, HTMLDialogElement);
    if (openButtonId !== "") {
        const openButton = $select.id(openButtonId, HTMLButtonElement);
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

/** Client script bridge for `Dialog`. */
function DialogScript(props: { dialogId: string; openButtonId: string }) {
    return (
        <Script
            $deps={[$select]}
            $args={[props.dialogId, props.openButtonId]}
            $exec={$initDialog}
        />
    );
}

/**
 * Modal `<dialog>` with title, optional description, Close control, and body.
 * Opens via `openButtonId` when set; otherwise open with `dialog.showModal()`
 * from other scripts.
 *
 * @param props.id - Dialog element id; generated when omitted.
 * @param props.openButtonId - Id of a button that opens the dialog.
 * @param props.title - Heading text.
 * @param props.description - Optional supporting copy under the title.
 * @param props.children - Dialog body (actions, forms, etc.).
 * @param props.className - Extra classes on the `<dialog>`.
 * @param props.contentClassName - Extra classes on the inner content wrapper.
 */
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
