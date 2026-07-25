import { $assertElement, $select } from "@/utils";
import { Button } from "@/components/form";
import { Script } from "@/components/script";
import { Dialog } from "@/components/ui/dialog";

const UNSAVED_CHANGES_DIALOG_ID = "unsaved-changes-dialog";
function $isFormDirty() {
    return document.documentElement.dataset.lokiFormDirty === "true";
}
function $clearFormDirty() {
    delete document.documentElement.dataset.lokiFormDirty;
    $select
        .all("form[data-loki-form-dirty]", HTMLFormElement)
        .forEach((form) => {
            delete form.dataset.lokiFormDirty;
        });
}
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
