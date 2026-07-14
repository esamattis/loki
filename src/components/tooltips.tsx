import { $assertElement } from "@/utils";
import { Script } from "@/components/script";

function $initTooltips() {
    const tooltip = document.createElement("div");
    tooltip.id = "tooltip";
    tooltip.role = "tooltip";
    tooltip.hidden = true;
    tooltip.className =
        "pointer-events-none fixed z-50 max-w-xs rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg dark:bg-slate-100 dark:text-slate-900";
    const tooltipText = document.createElement("span");
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.className =
        "absolute left-1/2 top-full -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-slate-900 dark:border-t-slate-100";
    tooltip.appendChild(tooltipText);
    tooltip.appendChild(arrow);
    document.body.appendChild(tooltip);
    let activeTarget: HTMLElement | null = null;
    function getTooltipTarget(target: EventTarget | null): HTMLElement | null {
        if (!(target instanceof Element)) return null;
        const tooltipTarget = target.closest("[data-tooltip]");
        if (!tooltipTarget) return null;
        $assertElement(tooltipTarget, HTMLElement);
        return tooltipTarget.dataset.tooltip ? tooltipTarget : null;
    }
    function showTooltip(target: HTMLElement) {
        activeTarget = target;
        tooltipText.textContent = target.dataset.tooltip!;
        tooltip.hidden = false;
        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        tooltip.style.left = `${Math.max(8, Math.min(targetRect.left + (targetRect.width - tooltipRect.width) / 2, window.innerWidth - tooltipRect.width - 8))}px`;
        tooltip.style.top = `${Math.max(8, targetRect.top - tooltipRect.height - 8)}px`;
    }
    function hideTooltip(target?: HTMLElement | null) {
        if (target && target !== activeTarget) return;
        activeTarget = null;
        tooltip.hidden = true;
    }
    document.addEventListener(
        "pointerover",
        (event) => {
            const target = getTooltipTarget(event.target);
            if (target) showTooltip(target);
        },
        { passive: true },
    );
    document.addEventListener(
        "pointerout",
        (event) => {
            const target = getTooltipTarget(event.target);
            const relatedTarget = event.relatedTarget;
            if (
                target &&
                relatedTarget instanceof Node &&
                target.contains(relatedTarget)
            )
                return;
            hideTooltip(target);
        },
        { passive: true },
    );
    document.addEventListener(
        "focusin",
        (event) => {
            const target = getTooltipTarget(event.target);
            if (target) showTooltip(target);
        },
        { passive: true },
    );
    document.addEventListener(
        "focusout",
        (event) => hideTooltip(getTooltipTarget(event.target)),
        { passive: true },
    );
    window.addEventListener("scroll", () => hideTooltip(), {
        capture: true,
        passive: true,
    });
}

export function Tooltips() {
    return <Script $deps={[$assertElement]} $exec={$initTooltips} />;
}
