type TemplateValue = string | Node;

export function $renderTemplate(
    container: HTMLElement,
    templateId: string,
    values: Record<string, TemplateValue> = {},
): void {
    const existingRoot = container.firstElementChild;
    const canRefill =
        container.childElementCount === 1 &&
        existingRoot instanceof HTMLElement &&
        existingRoot.dataset.renderTemplate === templateId;
    let root: HTMLElement | DocumentFragment;
    if (canRefill) root = existingRoot;
    else {
        const template = document.getElementById(templateId);
        if (!(template instanceof HTMLTemplateElement)) {
            throw new Error(`Template not found: ${templateId}`);
        }
        const clone = template.content.cloneNode(true);
        if (!(clone instanceof DocumentFragment)) {
            throw new Error(`Could not clone template: ${templateId}`);
        }
        root = clone;
        for (const slot of root.querySelectorAll("[data-template-slot]")) {
            slot.setAttribute("data-render-template-slot", templateId);
        }
    }

    const remainingNames = new Set(Object.keys(values));
    for (const slot of root.querySelectorAll("[data-template-slot]")) {
        if (slot.getAttribute("data-render-template-slot") !== templateId)
            continue;
        const name = slot.getAttribute("data-template-slot");
        if (name === null) throw new Error("Template slot has no name");
        const value = values[name];
        if (value === undefined)
            throw new Error(`Missing template value: ${name}`);
        if (!remainingNames.delete(name))
            throw new Error(`Duplicate template slot: ${name}`);
        slot.replaceChildren(value);
    }
    if (remainingNames.size > 0) {
        throw new Error(
            `Template slots not found: ${Array.from(remainingNames).join(", ")}`,
        );
    }
    if (canRefill) return;

    const element = root.firstElementChild;
    if (!(element instanceof HTMLElement) || root.childElementCount !== 1) {
        throw new Error(`Template must have one HTML root: ${templateId}`);
    }
    element.dataset.renderTemplate = templateId;
    container.replaceChildren(element);
}
