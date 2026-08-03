/**
 * Options for {@link formatDuration}.
 */
export type FormatDurationOptions = {
    /**
     * When `false`, rounds to the nearest minute and omits the seconds unit.
     * Defaults to `true`.
     */
    seconds?: boolean;
};

/**
 * Formats a non-negative duration in seconds as a compact `Xd Xh Xmin Xs` string.
 * Omits leading zero units except seconds, which are always shown unless disabled
 * via {@link FormatDurationOptions.seconds}.
 *
 * @param totalSeconds - Whole seconds to format.
 * @param options - Optional formatting controls.
 */
export function formatDuration(
    totalSeconds: number,
    options?: FormatDurationOptions,
): string {
    const includeSeconds = options?.seconds !== false;
    const value = includeSeconds
        ? totalSeconds
        : Math.round(totalSeconds / 60) * 60;
    const days = Math.floor(value / 86_400);
    const hours = Math.floor((value % 86_400) / 3_600);
    const minutes = Math.floor((value % 3_600) / 60);
    const seconds = value % 60;
    const parts = [];
    if (days > 0) {
        parts.push(`${days}d`);
    }
    if (hours > 0 || days > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0 || hours > 0 || days > 0) {
        parts.push(`${minutes}min`);
    }
    if (includeSeconds) {
        parts.push(`${seconds}s`);
    } else if (parts.length === 0) {
        parts.push("0min");
    }
    return parts.join(" ");
}
