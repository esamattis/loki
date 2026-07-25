import { formatCalendarDate, formatUnixDateTime } from "@/date-time";
import {
    formatAltitude,
    formatNumber,
    formatSpeed,
    type UserOptions,
} from "@/options";

export type NumberFormatter = (
    value: number,
    options?: Intl.NumberFormatOptions,
) => string;

export type AltitudeFormatter = (meters: number) => string;
export type CalendarDuration = {
    months: number;
    weeks: number;
    days: number;
};
export type CalendarDurationFormatter = (duration: CalendarDuration) => string;
export type DistanceFormatter = (meters: number) => string;
export type SpeedFormatter = (metersPerSecond: number) => string;

export interface DateFormatter {
    (value: string): string;
    (unixSeconds: number): string;
}

export function createNumberFormatter(
    numberFormat: UserOptions["numberFormat"],
): NumberFormatter {
    return function numberFormatter(value, options) {
        return formatNumber(value, numberFormat, options);
    };
}

export function createAltitudeFormatter(
    altitudeUnits: UserOptions["altitudeUnits"],
    numberFormat: UserOptions["numberFormat"],
): AltitudeFormatter {
    return function altitudeFormatter(meters) {
        return formatAltitude(meters, altitudeUnits, numberFormat);
    };
}

export function createCalendarDurationFormatter(
    formatNumber: NumberFormatter,
): CalendarDurationFormatter {
    return function calendarDurationFormatter(duration) {
        function formatPart(
            value: number,
            unit: "month" | "week" | "day",
        ): string {
            return `${formatNumber(value)} ${unit}${value === 1 ? "" : "s"}`;
        }
        return [
            formatPart(duration.months, "month"),
            formatPart(duration.weeks, "week"),
            formatPart(duration.days, "day"),
        ].join(", ");
    };
}

export function createDistanceFormatter(
    altitudeUnits: UserOptions["altitudeUnits"],
    formatNumber: NumberFormatter,
): DistanceFormatter {
    return function distanceFormatter(meters) {
        if (altitudeUnits === "feet") {
            return `${formatNumber(meters / 1609.344, { maximumFractionDigits: 1 })} mi`;
        }
        return `${formatNumber(meters / 1000, { maximumFractionDigits: 1 })} km`;
    };
}

export function createSpeedFormatter(
    speedUnits: UserOptions["speedUnits"],
    numberFormat: UserOptions["numberFormat"],
): SpeedFormatter {
    return function speedFormatter(metersPerSecond) {
        return formatSpeed(metersPerSecond, speedUnits, numberFormat);
    };
}

export function createDateFormatter(
    dateTimeFormat: UserOptions["dateTimeFormat"],
): DateFormatter {
    return function dateFormatter(value: string | number): string {
        return typeof value === "number"
            ? formatUnixDateTime(value, dateTimeFormat)
            : formatCalendarDate(value, dateTimeFormat);
    };
}
