import { formatCalendarDate, formatUnixDateTime } from "@/core/date-time";
import type { CoreUserOptions } from "@/core/options";

export type NumberFormatter = (
    value: number,
    options?: Intl.NumberFormatOptions,
) => string;
export type CalendarDuration = { months: number; weeks: number; days: number };
export type CalendarDurationFormatter = (duration: CalendarDuration) => string;
export interface DateFormatter {
    (value: string): string;
    (unixSeconds: number): string;
}

function numberFormatLocale(format: CoreUserOptions["numberFormat"]): string {
    if (format === "space-comma") return "fi-FI";
    if (format === "period-comma") return "de-DE";
    return "en-US";
}

export function createNumberFormatter(
    format: CoreUserOptions["numberFormat"],
): NumberFormatter {
    return function numberFormatter(value, options) {
        return value.toLocaleString(numberFormatLocale(format), options);
    };
}

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

export function createDateFormatter(
    format: CoreUserOptions["dateTimeFormat"],
): DateFormatter {
    return function dateFormatter(value: string | number): string {
        return typeof value === "number"
            ? formatUnixDateTime(value, format)
            : formatCalendarDate(value, format);
    };
}
