type ElementConstructor<T> = abstract new (...args: any[]) => T;
type SelectorRoot = Pick<ParentNode, "querySelector" | "querySelectorAll">;
type IdSelectorRoot = Pick<Document, "getElementById">;

export function $el<T>(
    selector: string,
    constructor: ElementConstructor<T>,
    root: SelectorRoot = document,
): T {
    const element = root.querySelector(selector);
    if (!(element instanceof constructor)) {
        throw new Error(
            `Expected element of type ${constructor.name}, got ${element === null ? "null" : element.constructor.name}`,
        );
    }
    return element;
}

export function $elOrNull<T>(
    selector: string,
    constructor: ElementConstructor<T>,
    root: SelectorRoot = document,
): T | null {
    const element = root.querySelector(selector);
    if (element === null) return null;
    if (!(element instanceof constructor)) {
        throw new Error(
            `Expected element of type ${constructor.name}, got ${element.constructor.name}`,
        );
    }
    return element;
}

export function $elAll<T>(
    selector: string,
    constructor: ElementConstructor<T>,
    root: SelectorRoot = document,
): T[] {
    const elements: T[] = [];
    for (const element of root.querySelectorAll(selector)) {
        if (!(element instanceof constructor)) {
            throw new Error(
                `Expected element of type ${constructor.name}, got ${element.constructor.name}`,
            );
        }
        elements.push(element);
    }
    return elements;
}

export function $elById<T>(
    id: string,
    constructor: ElementConstructor<T>,
    root: IdSelectorRoot = document,
): T {
    const element = root.getElementById(id);
    if (!(element instanceof constructor)) {
        throw new Error(
            `Expected element of type ${constructor.name}, got ${element === null ? "null" : element.constructor.name}`,
        );
    }
    return element;
}

export function $elByIdOrNull<T>(
    id: string,
    constructor: ElementConstructor<T>,
    root: IdSelectorRoot = document,
): T | null {
    const element = root.getElementById(id);
    if (element === null) return null;
    if (!(element instanceof constructor)) {
        throw new Error(
            `Expected element of type ${constructor.name}, got ${element.constructor.name}`,
        );
    }
    return element;
}
