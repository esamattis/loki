/** Returns whether an HTTP method is defined as safe and read-only. */
export function isSafeHttpMethod(method: string): boolean {
    return method === "GET" || method === "HEAD" || method === "OPTIONS";
}
