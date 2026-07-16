import { useId } from "hono/jsx";
import { $assertElement } from "@/utils";
import { Script } from "@/components/script";
import { $renderTemplate } from "@/utils";

function $initTooltips(templateId: string) {
    const container = document.createElement("div");
    $renderTemplate(container, templateId);
    const tooltipElement = container.firstElementChild;
    if (!(tooltipElement instanceof HTMLElement)) return;
    document.body.appendChild(tooltipElement);
    const tooltipNode = document.getElementById("tooltip");
    const tooltipTextNode = tooltipNode?.querySelector("[data-tooltip-text]");
    $assertElement(tooltipNode, HTMLDivElement);
    $assertElement(tooltipTextNode, HTMLSpanElement);
    const tooltip: HTMLDivElement = tooltipNode;
    const tooltipText: HTMLSpanElement = tooltipTextNode;
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
        if (!tooltip.matches(":popover-open")) tooltip.showPopover();
        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        tooltip.style.left = `${Math.max(8, Math.min(targetRect.left + (targetRect.width - tooltipRect.width) / 2, window.innerWidth - tooltipRect.width - 8))}px`;
        tooltip.style.top = `${Math.max(8, targetRect.top - tooltipRect.height - 8)}px`;
    }
    function hideTooltip(target?: HTMLElement | null) {
        if (target && target !== activeTarget) return;
        activeTarget = null;
        if (tooltip.matches(":popover-open")) tooltip.hidePopover();
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
    const templateId = useId();
    return (
        <>
            <template id={templateId}>
                <div
                    id="tooltip"
                    role="tooltip"
                    popover="manual"
                    hidden
                    class="pointer-events-none fixed inset-auto z-50 m-0 max-w-xs overflow-visible rounded-md border-0 bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
                >
                    <span data-tooltip-text></span>
                    <span
                        aria-hidden="true"
                        class="absolute left-1/2 top-full -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-slate-900 dark:border-t-slate-100"
                    ></span>
                </div>
            </template>
            <Script
                $deps={[$renderTemplate, $assertElement]}
                $args={[templateId]}
                $exec={$initTooltips}
            />
        </>
    );
}
