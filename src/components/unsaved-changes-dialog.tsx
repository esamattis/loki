import { $assertElement } from "@/utils";
import { Button } from "@/components/form";
import { Script } from "@/components/script";
import { Dialog } from "@/components/ui/dialog";

const UNSAVED_CHANGES_DIALOG_ID = "unsaved-changes-dialog";
function $isFormDirty() {
    return document.documentElement.dataset.formDirty === "true";
}
function $clearFormDirty() {
    delete document.documentElement.dataset.formDirty;
}
function $markFormDirtyFromEvent(event: Event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const form = target.closest("form");
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
    document.documentElement.dataset.formDirty = "true";
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
        (url.pathname === window.location.pathname &&
            url.search === window.location.search &&
            url.hash !== "") ||
        (url.pathname === window.location.pathname &&
            url.search === window.location.search &&
            url.hash === window.location.hash)
    )
        return null;
    return anchor.href;
}
function $guardUnsavedFormChanges(dialogId: string) {
    let pendingHref: string | null = null;
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
    const dialog = document.getElementById(dialogId);
    $assertElement(dialog, HTMLDialogElement);
    dialog.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLButtonElement) || target.value !== "ok")
            return;
        const href = pendingHref;
        pendingHref = null;
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
                <div className="flex justify-end">
                    <Button type="button" value="ok" variant="primary">
                        Leave
                    </Button>
                </div>
            </Dialog>
            <UnsavedChangesGuard />
        </>
    );
}
