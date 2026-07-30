/** Describes account identity field. */
export type AccountIdentityField = "username" | "email";

/** Collects messages from an error and its chained causes. */
function errorChainMessages(error: unknown): string[] {
    const messages: string[] = [];
    let current = error;
    while (current instanceof Error) {
        messages.push(current.message);
        current = current.cause;
    }
    return messages;
}

/** Identifies account field. */
export function uniqueAccountField(
    error: unknown,
): AccountIdentityField | undefined {
    const messages = errorChainMessages(error);
    if (
        messages.some(
            (message) =>
                message.includes("UNIQUE constraint failed: users.username") ||
                message.includes("users_username_unique"),
        )
    ) {
        return "username";
    }
    if (
        messages.some(
            (message) =>
                message.includes("UNIQUE constraint failed: users.email") ||
                message.includes("users_email_unique"),
        )
    ) {
        return "email";
    }
}

/** Returns the user-facing uniqueness error for an account identity field. */
export function accountIdentityError(field: AccountIdentityField): string {
    return field === "username"
        ? "Username is already in use"
        : "Email address is already in use";
}
