import { formatCalendarDate, formatUnixDateTime } from "@/core/date-time";
import type { CoreUserOptions } from "@/core/options";

/** Formats a number with the user's number format preference. */
export type NumberFormatter = (
    value: number,
    options?: Intl.NumberFormatOptions,
) => string;
/** Broken-down calendar duration used by jump/logbook UIs. */
export type CalendarDuration = { months: number; weeks: number; days: number };
/** Formats a {@link CalendarDuration} as human-readable English units. */
export type CalendarDurationFormatter = (duration: CalendarDuration) => string;
/**
 * Formats either an ISO calendar date string or a Unix timestamp (seconds)
 * using the user's date/time preference.
 */
export interface DateFormatter {
    (value: string): string;
    (unixSeconds: number): string;
}

/** Maps a number-format preference to an `Intl` locale tag. */
function numberFormatLocale(format: CoreUserOptions["numberFormat"]): string {
    if (format === "space-comma") return "fi-FI";
    if (format === "period-comma") return "de-DE";
    return "en-US";
}

/**
 * Returns a number formatter bound to the user's number format preference.
 *
 * @param format - `space-comma` | `period-comma` | `comma-period`.
 */
export function createNumberFormatter(
    format: CoreUserOptions["numberFormat"],
): NumberFormatter {
    return function numberFormatter(value, options) {
        return value.toLocaleString(numberFormatLocale(format), options);
    };
}

/**
 * Returns a formatter for month/week/day durations using `formatNumber` for
 * the numeric parts.
 *
 * @param formatNumber - Number formatter from {@link createNumberFormatter}.
 */
export function createCalendarDurationFormatter(
    formatNumber: NumberFormatter,
): CalendarDurationFormatter {
    return function calendarDurationFormatter(duration) {
        function part(value: number, unit: "month" | "week" | "day"): string {
            return `${formatNumber(value)} ${unit}${value === 1 ? "" : "s"}`;
        }
        return [
            part(duration.months, "month"),
            part(duration.weeks, "week"),
            part(duration.days, "day"),
        ].join(", ");
    };
}

/**
 * Returns a date formatter for ISO calendar strings or Unix seconds.
 *
 * @param format - User date/time format preference.
 */
export function createDateFormatter(
    format: CoreUserOptions["dateTimeFormat"],
): DateFormatter {
    return function dateFormatter(value: string | number): string {
        return typeof value === "number"
            ? formatUnixDateTime(value, format)
            : formatCalendarDate(value, format);
    };
}
