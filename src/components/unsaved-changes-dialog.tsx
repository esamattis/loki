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
function $navigationHrefFromClick(event: MouseEvent): string | null {
    if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
    )
        return null;
    const target = event.target;
    if (!(target instanceof Element)) return null;
    const anchor = target.closest("a");
    if (
        !(anchor instanceof HTMLAnchorElement) ||
        !anchor.href ||
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self")
    )
        return null;
    let url: URL;
    try {
        url = new URL(anchor.href, window.location.href);
    } catch {
        return null;
    }
    if (
        (url.protocol !== "http:" && url.protocol !== "https:") ||
        (url.origin === window.location.origin &&
            url.pathname === window.location.pathname &&
            url.search === window.location.search)
    )
        return null;
    return anchor.href;
}
function $guardUnsavedFormChanges(dialogId: string) {
    let pendingHref: string | null = null;
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
            pendingHref = null;
            const form = pendingForm;
            pendingForm = null;
            $assertElement(form, HTMLFormElement);
            form.requestSubmit();
            dialog.close();
            return;
        }
        if (target.value !== "leave") return;
        const href = pendingHref;
        pendingHref = null;
        pendingForm = null;
        $clearFormDirty();
        dialog.close();
        if (href) window.location.href = href;
    });
    document.addEventListener(
        "click",
        (event) => {
            if (!$isFormDirty()) return;
            const href = $navigationHrefFromClick(event);
            if (!href) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            pendingHref = href;
            const form = $select.el(
                "form[data-loki-form-dirty]",
                HTMLFormElement,
            );
            pendingForm = form;
            const title = $select.el("h2", HTMLHeadingElement, dialog);
            title.textContent = form.dataset.lokiConfirm ?? "";
            dialog.showModal();
        },
        true,
    );
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
                $navigationHrefFromClick,
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
