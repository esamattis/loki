type ElementConstructor<T> = abstract new (...args: any[]) => T;
type SelectorRoot = Pick<ParentNode, "querySelector" | "querySelectorAll">;
type IdSelectorRoot = Pick<Document, "getElementById">;

function $el<T>(
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

function $elOrNull<T>(
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

function $all(selector: string, root?: SelectorRoot): Element[];
function $all<T>(
    selector: string,
    constructor: ElementConstructor<T>,
    root?: SelectorRoot,
): T[];
function $all<T>(
    selector: string,
    constructorOrRoot: ElementConstructor<T> | SelectorRoot = document,
    root: SelectorRoot = document,
): any[] {
    const constructor =
        typeof constructorOrRoot === "function" ? constructorOrRoot : Element;
    const selectorRoot =
        typeof constructorOrRoot === "function" ? root : constructorOrRoot;
    const elements: any[] = [];
    for (const element of selectorRoot.querySelectorAll(selector)) {
        if (!(element instanceof constructor)) {
            throw new Error(
                `Expected element of type ${constructor.name}, got ${element.constructor.name}`,
            );
        }
        elements.push(element);
    }
    return elements;
}

function $id<T>(
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

function $idOrNull<T>(
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

export const $select = Object.defineProperty(
    {
        el: $el,
        elOrNull: $elOrNull,
        all: $all,
        id: $id,
        idOrNull: $idOrNull,
    },
    "displayName",
    { value: "$select" },
);
