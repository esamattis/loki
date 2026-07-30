/**
 * Narrows `value` to non-nullish, or throws. Use after lookups that must succeed.
 *
 * @param value - Value that must not be `null` or `undefined`.
 * @param message - Optional error message when the assertion fails.
 */
export function assertNotNullish<T>(
    value: T,
    message?: string,
): asserts value is NonNullable<T> {
    if (value == null) {
        throw new Error(message || "Value is null or undefined");
    }
}
