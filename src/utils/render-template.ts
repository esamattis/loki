type TemplateValue = string | Node;

export function $renderTemplate(
    templateId: string,
    values: Record<string, TemplateValue> = {},
): HTMLElement {
    const template = document.getElementById(templateId);
    if (!(template instanceof HTMLTemplateElement)) {
        throw new Error(`Template not found: ${templateId}`);
    }

    const fragment = template.content.cloneNode(true);
    if (!(fragment instanceof DocumentFragment)) {
        throw new Error(`Could not clone template: ${templateId}`);
    }

    const remainingNames = new Set(Object.keys(values));
    for (const slot of fragment.querySelectorAll("[data-template-slot]")) {
        const name = slot.getAttribute("data-template-slot");
        if (name === null) {
            throw new Error(`Missing template value: ${name}`);
        }
        const value = values[name];
        if (value === undefined) {
            throw new Error(`Missing template value: ${name}`);
        }
        if (!remainingNames.delete(name)) {
            throw new Error(`Duplicate template slot: ${name}`);
        }
        slot.replaceChildren(value);
        slot.removeAttribute("data-template-slot");
    }
    if (remainingNames.size > 0) {
        throw new Error(
            `Template slots not found: ${Array.from(remainingNames).join(", ")}`,
        );
    }

    const element = fragment.firstElementChild;
    if (!(element instanceof HTMLElement) || fragment.childElementCount !== 1) {
        throw new Error(`Template must have one HTML root: ${templateId}`);
    }
    return element;
}
