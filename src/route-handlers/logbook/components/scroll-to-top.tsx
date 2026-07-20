import { ChevronUpIcon } from "@/components/icons";
import { Script } from "@/components/script";
import { $select } from "@/utils";
import { useId } from "hono/jsx";

function $initScrollToTop(buttonId: string) {
    const button = $select.id(buttonId, HTMLButtonElement);
    let ticking = false;

    function updateVisibility() {
        button.hidden = window.scrollY < window.innerHeight;
        ticking = false;
    }

    window.addEventListener(
        "scroll",
        () => {
            if (!ticking) {
                window.requestAnimationFrame(updateVisibility);
                ticking = true;
            }
        },
        { passive: true },
    );
    window.addEventListener("resize", updateVisibility);
    button.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
    updateVisibility();
}

export function ScrollToTop() {
    const buttonId = useId();

    return (
        <>
            <button
                id={buttonId}
                type="button"
                hidden
                aria-label="Scroll to top"
                className="fixed bottom-20 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-lg ring-1 ring-slate-900/5 backdrop-blur-md transition hover:bg-white hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 sm:bottom-6 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:ring-slate-100/10 dark:hover:bg-slate-900 dark:hover:text-white dark:focus-visible:ring-indigo-400/40"
            >
                <ChevronUpIcon className="h-6 w-6" />
            </button>
            <Script
                $deps={[$select]}
                $args={[buttonId]}
                $exec={$initScrollToTop}
            />
        </>
    );
}
