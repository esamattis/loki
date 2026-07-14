export function getFormString(formData: FormData, name: string): string {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
}

export function assertNotNullish<T>(
    value: T,
    message?: string,
): asserts value is NonNullable<T> {
    if (value == null) {
        throw new Error(message || "Value is null or undefined");
    }
}

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

export function $showAndroidChromeHint(hint: HTMLParagraphElement) {
    const ua = navigator.userAgent;
    const notChrome =
        /SamsungBrowser|Firefox|OPR\/|Opera/i.test(ua) || !/Chrome\//i.test(ua);
    if (/Android/i.test(ua) && notChrome) {
        hint.hidden = false;
        hint.textContent =
            "For the best experience on Android, install this app using Chrome. " +
            "Chrome enables sharing images from other apps directly into Loki.";
    }
}
