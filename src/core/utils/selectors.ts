type ElementConstructor<T> = abstract new (...args: any[]) => T;
type SelectorRoot = Pick<ParentNode, "querySelector" | "querySelectorAll">;
type IdSelectorRoot = Pick<Document, "getElementById">;

/**
 * Queries one element and asserts it is an instance of `constructor`.
 * Throws when missing or of the wrong type.
 */
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

/**
 * Like `$el`, but returns `null` when no match. Still throws on wrong type.
 */
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

/**
 * Queries all matching elements. With a constructor, asserts every match is
 * that type; without one, returns `Element[]`.
 */
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

/**
 * Looks up an element by id and asserts it is an instance of `constructor`.
 * Throws when missing or of the wrong type.
 */
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

/**
 * Like `$id`, but returns `null` when no element has that id. Still throws on
 * wrong type.
 */
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

/**
 * Browser DOM query helpers that assert element types at runtime.
 * Pass the whole object to `Script` via `$deps={[$select]}`; never individual methods.
 *
 * - `el` / `id` — required match, throws if missing or wrong type
 * - `elOrNull` / `idOrNull` — optional match, throws only on wrong type
 * - `all` — all matches, optionally typed by constructor
 */
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
