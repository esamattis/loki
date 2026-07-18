import { $elAll, $elById } from "@/utils/selectors";

type TemplateValue = string | Node;

/**
 * Clones a `<template>` into a container and fills its named
 * `data-loki-template-slot` elements with text or DOM nodes.
 *
 * Use this either to render repeatedly into a stable container, which preserves
 * the existing root and updates only its slots, or with a detached container as
 * a factory whose rendered root is moved into a list or document fragment.
 * Templates must have exactly one HTML root, every slot must have one matching
 * value, slot names must be unique, and slots must not be nested. Strings are
 * inserted as text, not HTML.
 *
 * In an SSR component, generate the container and template IDs with `useId()`,
 * assign them to the corresponding elements, and pass both IDs to `Script`
 * through `$args`. The browser function should look up and assert the container
 * before calling `$renderTemplate(container, templateId, values)`.
 */
export function $renderTemplate(
    container: HTMLElement,
    templateId: string,
    values: Record<string, TemplateValue> = {},
): void {
    const existingRoot = container.firstElementChild;
    const canRefill =
        container.childElementCount === 1 &&
        existingRoot instanceof HTMLElement &&
        existingRoot.dataset.lokiRenderTemplate === templateId;
    let root: HTMLElement | DocumentFragment;
    let element: HTMLElement;
    if (canRefill) {
        root = existingRoot;
        element = existingRoot;
    } else {
        const template = $elById(templateId, HTMLTemplateElement);
        const clone = template.content.cloneNode(true);
        if (!(clone instanceof DocumentFragment)) {
            throw new Error(`Could not clone template: ${templateId}`);
        }
        root = clone;
        const cloneRoot = root.firstElementChild;
        if (
            !(cloneRoot instanceof HTMLElement) ||
            root.childElementCount !== 1
        ) {
            throw new Error(`Template must have one HTML root: ${templateId}`);
        }
        element = cloneRoot;
        for (const slot of $elAll("[data-loki-template-slot]", Element, root)) {
            slot.setAttribute("data-loki-render-template-slot", templateId);
        }
    }

    const slots = $elAll("[data-loki-template-slot]", Element, root);
    if (
        root instanceof HTMLElement &&
        root.matches("[data-loki-template-slot]")
    ) {
        slots.unshift(root);
    }
    const ownedSlots = slots.filter(
        (slot) =>
            slot.getAttribute("data-loki-render-template-slot") === templateId,
    );
    const remainingNames = new Set(Object.keys(values));
    const replacements: { slot: Element; value: TemplateValue }[] = [];
    for (const slot of ownedSlots) {
        const name = slot.getAttribute("data-loki-template-slot");
        if (name === null) throw new Error("Template slot has no name");
        if (
            ownedSlots.some(
                (possibleParent) =>
                    possibleParent !== slot && possibleParent.contains(slot),
            )
        ) {
            throw new Error(`Nested template slot: ${name}`);
        }
        const value = values[name];
        if (value === undefined)
            throw new Error(`Missing template value: ${name}`);
        if (!remainingNames.delete(name))
            throw new Error(`Duplicate template slot: ${name}`);
        replacements.push({ slot, value });
    }
    if (remainingNames.size > 0) {
        throw new Error(
            `Template slots not found: ${Array.from(remainingNames).join(", ")}`,
        );
    }
    for (const replacement of replacements) {
        replacement.slot.replaceChildren(replacement.value);
    }
    if (canRefill) return;

    element.dataset.lokiRenderTemplate = templateId;
    container.replaceChildren(element);
}
