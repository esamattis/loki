import { Script } from "@/core/components/script";

/**
 * Saves scroll position on form submit and restores it after a same-path
 * validation re-render so the user stays near the field they were editing.
 */
function $restoreFormScrollPosition() {
    const storageKey = "form-scroll-position";
    const storedPosition = sessionStorage.getItem(storageKey);
    if (storedPosition) {
        const parts = storedPosition.split(",");
        const pathname = parts[0];
        const x = Number(parts[1]);
        const y = Number(parts[2]);
        if (
            pathname === window.location.pathname &&
            Number.isFinite(x) &&
            Number.isFinite(y)
        )
            window.scrollTo(x, y);
        sessionStorage.removeItem(storageKey);
    }
    document.addEventListener("submit", () =>
        sessionStorage.setItem(
            storageKey,
            `${window.location.pathname},${window.scrollX},${window.scrollY}`,
        ),
    );
}

/**
 * Restores window scroll after form POST validation responses that re-render
 * the same path. Render once in the layout.
 */
export function RestoreFormScrollPosition() {
    return <Script $exec={$restoreFormScrollPosition} />;
}
