import { Script } from "@/components/script";

function $showNavigationProgress(options: {
    mode: "form" | "link";
    method?: string;
}) {
    if (document.getElementById("form-submit-progress")) return;
    const isPost =
        options.mode === "form" &&
        (options.method ?? "get").toLowerCase() === "post";
    const progress = document.createElement("div");
    progress.id = "form-submit-progress";
    progress.setAttribute("role", "progressbar");
    if (isPost) progress.classList.add("form-submit-progress-post");
    progress.setAttribute(
        "aria-label",
        options.mode === "form" ? "Submitting form" : "Loading page",
    );
    progress.setAttribute(
        "aria-valuetext",
        options.mode === "form" ? "Submitting" : "Loading",
    );
    document.body.appendChild(progress);
}

function $disableFormOnSubmit() {
    document.addEventListener("submit", (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;
        form.setAttribute("aria-busy", "true");
        form.classList.add(
            "opacity-60",
            "cursor-not-allowed",
            "pointer-events-none",
            "select-none",
        );
        $showNavigationProgress({ mode: "form", method: form.method });
        const submitter = event.submitter;
        if (submitter instanceof HTMLButtonElement) {
            submitter.classList.add("form-submit-pending");
            if (!submitter.querySelector(".form-submit-spinner")) {
                const spinner = document.createElement("span");
                spinner.className = "form-submit-spinner";
                spinner.setAttribute("aria-hidden", "true");
                submitter.insertBefore(spinner, submitter.firstChild);
            }
        }
        setTimeout(() => {
            for (const element of form.elements)
                if (
                    element instanceof HTMLInputElement ||
                    element instanceof HTMLButtonElement ||
                    element instanceof HTMLSelectElement ||
                    element instanceof HTMLTextAreaElement
                )
                    element.disabled = true;
        }, 0);
    });
}

function $showProgressOnLinkClick() {
    document.addEventListener("click", (event) => {
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        )
            return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        const anchor = target.closest("a");
        if (
            !(anchor instanceof HTMLAnchorElement) ||
            !anchor.href ||
            anchor.hasAttribute("download") ||
            (anchor.target && anchor.target !== "_self")
        )
            return;
        let url: URL;
        try {
            url = new URL(anchor.href, window.location.href);
        } catch {
            return;
        }
        if (
            url.origin !== window.location.origin ||
            (url.pathname === window.location.pathname &&
                url.search === window.location.search &&
                url.hash !== "") ||
            (url.protocol !== "http:" && url.protocol !== "https:")
        )
            return;
        $showNavigationProgress({ mode: "link" });
    });
}

export function DisableFormOnSubmit() {
    return (
        <Script
            $deps={[$showNavigationProgress]}
            $exec={$disableFormOnSubmit}
        />
    );
}
export function ShowProgressOnLinkClick() {
    return (
        <Script
            $deps={[$showNavigationProgress]}
            $exec={$showProgressOnLinkClick}
        />
    );
}
