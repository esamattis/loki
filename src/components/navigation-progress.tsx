import { useId } from "hono/jsx";
import { Script } from "@/components/script";
import { $renderTemplate } from "@/utils";

function $showNavigationProgress(options: {
    mode: "form" | "link";
    method?: string;
    templateId: string;
}) {
    if (document.getElementById("form-submit-progress")) return;
    const isPost =
        options.mode === "form" &&
        (options.method ?? "get").toLowerCase() === "post";
    const progress = $renderTemplate(options.templateId);
    progress.classList.toggle("form-submit-progress-post", isPost);
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

function $clearNavigationProgress() {
    document.getElementById("form-submit-progress")?.remove();
}

function $disableFormOnSubmit(config: {
    progressTemplateId: string;
    spinnerTemplateId: string;
}) {
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
        $showNavigationProgress({
            mode: "form",
            method: form.method,
            templateId: config.progressTemplateId,
        });
        const submitter = event.submitter;
        if (submitter instanceof HTMLButtonElement) {
            submitter.classList.add("form-submit-pending");
            if (!submitter.querySelector(".form-submit-spinner")) {
                submitter.insertBefore(
                    $renderTemplate(config.spinnerTemplateId),
                    submitter.firstChild,
                );
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

function $showProgressOnLinkClick(templateId: string) {
    window.addEventListener("pageshow", $clearNavigationProgress);
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
        $showNavigationProgress({ mode: "link", templateId });
    });
}

function NavigationProgressTemplate(props: { id: string }) {
    return (
        <template id={props.id}>
            <div id="form-submit-progress" role="progressbar"></div>
        </template>
    );
}

export function DisableFormOnSubmit() {
    const progressTemplateId = useId();
    const spinnerTemplateId = useId();
    return (
        <>
            <NavigationProgressTemplate id={progressTemplateId} />
            <template id={spinnerTemplateId}>
                <span class="form-submit-spinner" aria-hidden="true"></span>
            </template>
            <Script
                $deps={[$renderTemplate, $showNavigationProgress]}
                $args={[{ progressTemplateId, spinnerTemplateId }]}
                $exec={$disableFormOnSubmit}
            />
        </>
    );
}
export function ShowProgressOnLinkClick() {
    const progressTemplateId = useId();
    return (
        <>
            <NavigationProgressTemplate id={progressTemplateId} />
            <Script
                $deps={[
                    $renderTemplate,
                    $showNavigationProgress,
                    $clearNavigationProgress,
                ]}
                $args={[progressTemplateId]}
                $exec={$showProgressOnLinkClick}
            />
        </>
    );
}
