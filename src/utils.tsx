export function assertNotNullish<T>(
    value: T,
    message?: string,
): asserts value is NonNullable<T> {
    if (value == null) {
        throw new Error(message || "Value is null or undefined");
    }
}

export function $assertElement<T>(
    node: any,
    el: new (...args: any[]) => T,
): asserts node is T {
    if (!(node instanceof el)) {
        throw new Error(
            `Expected element of type ${el.name}, got ${typeof node}`,
        );
    }
}
