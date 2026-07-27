/**
 * Reads a string field from `FormData`, returning `""` when missing or non-string.
 *
 * @param formData - Submitted form data.
 * @param name - Field name to read.
 */
export function getFormString(formData: FormData, name: string): string {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
}
