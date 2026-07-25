import { Script } from "@/components/script";

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

export function RestoreFormScrollPosition() {
    return <Script $exec={$restoreFormScrollPosition} />;
}
