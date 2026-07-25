import { $select } from "@/utils";
import { Script } from "@/components/script";

const UPDATE_TOAST_ID = "update-toast";
function $initUpdateToast(toastId: string) {
    const toast = $select.id(toastId, HTMLDivElement);
    const reload = $select.el(
        "[data-loki-update-toast-reload]",
        HTMLButtonElement,
        toast,
    );
    reload.addEventListener("click", () => window.location.reload());
    const dismiss = $select.el(
        "[data-loki-update-toast-dismiss]",
        HTMLButtonElement,
        toast,
    );
    dismiss.addEventListener("click", () => {
        toast.hidden = true;
    });
}
export function UpdateToast() {
    return (
        <div
            id={UPDATE_TOAST_ID}
            hidden
            role="status"
            aria-live="polite"
            className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
            <span className="text-sm text-slate-700 dark:text-slate-300">
                A new version is available.
            </span>
            <button
                type="button"
                data-loki-update-toast-reload
                className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
                Reload
            </button>
            <button
                type="button"
                data-loki-update-toast-dismiss
                className="rounded-lg px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
                Dismiss
            </button>
            <Script
                $deps={[$select]}
                $args={[UPDATE_TOAST_ID]}
                $exec={$initUpdateToast}
            />
        </div>
    );
}
