type ElementConstructor<T> = abstract new (...args: any[]) => T;

/**
 * Asserts that `node` is an instance of the given element constructor(s).
 * Narrows the type of `node` and throws if the runtime check fails.
 *
 * @example
 * $assertElement(button, HTMLButtonElement);
 * $assertElement(el, [HTMLButtonElement, HTMLDivElement]);
 */
export function $assertElement<T>(
    node: any,
    el: ElementConstructor<T>,
): asserts node is T;
export function $assertElement<T>(
    node: any,
    els: readonly ElementConstructor<T>[],
): asserts node is T;
export function $assertElement<T>(
    node: any,
    el: ElementConstructor<T> | readonly ElementConstructor<T>[],
): asserts node is T {
    const constructors: readonly ElementConstructor<T>[] =
        typeof el === "function" ? [el] : el;
    if (!constructors.some((ctor) => node instanceof ctor)) {
        throw new Error(
            `Expected element of type ${constructors.map((c) => c.name).join(" | ")}, got ${typeof node}`,
        );
    }
}
