import { $assertElement, $select } from "@/core/utils";
import { Button } from "@/core/components/form";
import { Script } from "@/core/components/script";
import { Dialog } from "@/core/components/ui/dialog";

/** Stores the unsaved changes dialog id used by this module. */
const UNSAVED_CHANGES_DIALOG_ID = "unsaved-changes-dialog";

/** Whether any opted-in form currently has unsaved edits. */
function $isFormDirty() {
    return document.documentElement.dataset.lokiFormDirty === "true";
}

/** Clears dirty markers on the document and all tracked forms. */
function $clearFormDirty() {
    delete document.documentElement.dataset.lokiFormDirty;
    $select
        .all("form[data-loki-form-dirty]", HTMLFormElement)
        .forEach((form) => {
            delete form.dataset.lokiFormDirty;
        });
}
/**
 * Marks a form dirty when a visible control inside a `data-loki-confirm` POST
 * form changes. Hidden inputs are ignored.
 */
function $markFormDirtyFromEvent(event: Event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const form = target.closest("form[data-loki-confirm]");
    if (
        !(form instanceof HTMLFormElement) ||
        form.method.toLowerCase() !== "post" ||
        !(
            target instanceof HTMLInputElement ||
            target instanceof HTMLSelectElement ||
            target instanceof HTMLTextAreaElement
        ) ||
        (target instanceof HTMLInputElement && target.type === "hidden")
    )
        return;
    document.documentElement.dataset.lokiFormDirty = "true";
    form.dataset.lokiFormDirty = "true";
}
/**
 * Intercepts Navigation API navigations and `beforeunload` while a tracked form
 * is dirty, showing the unsaved-changes dialog with Cancel / Save / Leave.
 */
function $guardUnsavedFormChanges(dialogId: string) {
    let pendingNavigation: {
        url: string;
        key: string;
        type: NavigationType;
    } | null = null;
    let pendingForm: HTMLFormElement | null = null;
    const initiallyDirtyForm = $select.elOrNull(
        'form[data-loki-dirty="true"]',
        HTMLFormElement,
    );
    if (initiallyDirtyForm) {
        document.documentElement.dataset.lokiFormDirty = "true";
        initiallyDirtyForm.dataset.lokiFormDirty = "true";
    }
    document.addEventListener("input", $markFormDirtyFromEvent, true);
    document.addEventListener("change", $markFormDirtyFromEvent, true);
    document.addEventListener(
        "submit",
        (event) => {
            const form = event.target;
            if (
                form instanceof HTMLFormElement &&
                form.method.toLowerCase() === "post"
            )
                $clearFormDirty();
        },
        true,
    );
    window.addEventListener("beforeunload", (event) => {
        if ($isFormDirty()) {
            event.preventDefault();
            event.returnValue = "";
        }
    });
    const dialog = $select.id(dialogId, HTMLDialogElement);
    dialog.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLButtonElement)) return;
        if (target.value === "save") {
            event.preventDefault();
            pendingNavigation = null;
            const form = pendingForm;
            pendingForm = null;
            $assertElement(form, HTMLFormElement);
            form.requestSubmit();
            dialog.close();
            return;
        }
        if (target.value !== "leave") return;
        const destination = pendingNavigation;
        pendingNavigation = null;
        pendingForm = null;
        $clearFormDirty();
        dialog.close();
        if (!destination || !("navigation" in window)) return;
        if (destination.type === "traverse") {
            window.navigation.traverseTo(destination.key);
        } else if (destination.type === "reload") {
            window.navigation.reload();
        } else {
            window.navigation.navigate(destination.url, {
                history: destination.type === "replace" ? "replace" : "push",
            });
        }
    });
    if ("navigation" in window) {
        window.navigation.addEventListener("navigate", (event) => {
            if (!$isFormDirty()) return;
            const destination = new URL(event.destination.url);
            if (
                !event.cancelable ||
                !event.canIntercept ||
                (destination.origin === window.location.origin &&
                    destination.pathname === window.location.pathname &&
                    destination.search === window.location.search)
            )
                return;
            event.preventDefault();
            pendingNavigation = {
                url: event.destination.url,
                key: event.destination.key,
                type: event.navigationType,
            };
            const form = $select.el(
                "form[data-loki-form-dirty]",
                HTMLFormElement,
            );
            pendingForm = form;
            const title = $select.el("h2", HTMLHeadingElement, dialog);
            title.textContent = form.dataset.lokiConfirm ?? "";
            dialog.showModal();
        });
    }
}
/** Client script that attaches unsaved-change guards for the dialog. */
function UnsavedChangesGuard() {
    return (
        <Script
            $deps={[
                $assertElement,
                $select,
                $isFormDirty,
                $clearFormDirty,
                $markFormDirtyFromEvent,
            ]}
            $args={[UNSAVED_CHANGES_DIALOG_ID]}
            $exec={$guardUnsavedFormChanges}
        />
    );
}
/**
 * Modal and client guard for forms opted in with `data-loki-confirm="…"`.
 * Prompts before leaving with unsaved edits; Save submits the dirty form.
 * Render once in the app shell.
 */
export function UnsavedChangesDialog() {
    return (
        <>
            <Dialog
                id={UNSAVED_CHANGES_DIALOG_ID}
                title="Unsaved changes"
                description="You have unsaved changes. Leave this page without saving?"
            >
                <div className="flex justify-end gap-2">
                    <Button type="button" value="cancel" variant="secondary">
                        Cancel
                    </Button>
                    <Button type="button" value="save" variant="primary">
                        Save
                    </Button>
                    <Button type="button" value="leave" variant="danger">
                        Leave
                    </Button>
                </div>
            </Dialog>
            <UnsavedChangesGuard />
        </>
    );
}
