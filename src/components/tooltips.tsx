import { useId } from "hono/jsx";
import { Script } from "@/components/script";
import { $renderTemplate, $select } from "@/utils";

function $initTooltips(templateId: string) {
    const EDGE_MARGIN = 8;
    const TARGET_GAP = 8;
    const ARROW_ABOVE =
        "absolute -translate-x-1/2 top-full border-x-4 border-t-4 border-x-transparent border-t-slate-900 dark:border-t-slate-100";
    const ARROW_BELOW =
        "absolute -translate-x-1/2 bottom-full border-x-4 border-b-4 border-x-transparent border-b-slate-900 dark:border-b-slate-100";
    const container = document.createElement("div");
    $renderTemplate(container, templateId);
    const tooltipElement = container.firstElementChild;
    if (!(tooltipElement instanceof HTMLElement)) return;
    document.body.appendChild(tooltipElement);
    const tooltipNode = $select.id("tooltip", HTMLDivElement);
    const tooltipTextNode = $select.el(
        "[data-loki-tooltip-text]",
        HTMLSpanElement,
        tooltipNode,
    );
    const tooltipArrowNode = $select.el(
        "[data-loki-tooltip-arrow]",
        HTMLSpanElement,
        tooltipNode,
    );
    const tooltip: HTMLDivElement = tooltipNode;
    const tooltipText: HTMLSpanElement = tooltipTextNode;
    const tooltipArrow: HTMLSpanElement = tooltipArrowNode;
    let activeTarget: HTMLElement | null = null;
    function getTooltipTarget(target: EventTarget | null): HTMLElement | null {
        if (!(target instanceof Element)) return null;
        const tooltipTarget = target.closest("[data-loki-tooltip]");
        if (!(tooltipTarget instanceof HTMLElement)) return null;
        return tooltipTarget.dataset.lokiTooltip ? tooltipTarget : null;
    }
    function positionTooltip(target: HTMLElement) {
        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const left = Math.max(
            EDGE_MARGIN,
            Math.min(
                targetRect.left + (targetRect.width - tooltipRect.width) / 2,
                window.innerWidth - tooltipRect.width - EDGE_MARGIN,
            ),
        );
        const spaceAbove = targetRect.top - EDGE_MARGIN;
        const spaceBelow = window.innerHeight - targetRect.bottom - EDGE_MARGIN;
        const needed = tooltipRect.height + TARGET_GAP;
        const placeBelow = spaceAbove < needed && spaceBelow >= spaceAbove;
        const top = placeBelow
            ? targetRect.bottom + TARGET_GAP
            : Math.max(
                  EDGE_MARGIN,
                  targetRect.top - tooltipRect.height - TARGET_GAP,
              );
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltipArrow.className = placeBelow ? ARROW_BELOW : ARROW_ABOVE;
        tooltipArrow.style.left = `${targetRect.left + targetRect.width / 2 - left}px`;
    }
    function showTooltip(target: HTMLElement) {
        activeTarget = target;
        tooltipText.textContent = target.dataset.lokiTooltip!;
        tooltip.hidden = false;
        if (!tooltip.matches(":popover-open")) tooltip.showPopover();
        positionTooltip(target);
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
                    <span data-loki-tooltip-text></span>
                    <span
                        aria-hidden="true"
                        data-loki-tooltip-arrow
                        class="absolute -translate-x-1/2 top-full border-x-4 border-t-4 border-x-transparent border-t-slate-900 dark:border-t-slate-100"
                    ></span>
                </div>
            </template>
            <Script
                $deps={[$select, $renderTemplate]}
                $args={[templateId]}
                $exec={$initTooltips}
            />
        </>
    );
}
