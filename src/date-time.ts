import type { UserOptions } from "@/options";

type DateTimeFormat = UserOptions["dateTimeFormat"];

function parseCalendarDate(value: string): {
    year: string;
    month: string;
    day: string;
} {
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) {
        return { year: value, month: "", day: "" };
    }
    return { year, month, day };
}

function withoutLeadingZero(value: string): string {
    return String(Number(value));
}

export function formatCalendarDate(
    value: string,
    format: DateTimeFormat,
): string {
    const date = parseCalendarDate(value);
    if (!date.month || !date.day) {
        return value;
    }
    if (format === "finnish") {
        return `${withoutLeadingZero(date.day)}.${withoutLeadingZero(date.month)}.${date.year}`;
    }
    if (format === "european") {
        return `${date.day}/${date.month}/${date.year}`;
    }
    if (format === "american") {
        return `${date.month}/${date.day}/${date.year}`;
    }
    return value;
}

function formatTime(date: Date, format: DateTimeFormat): string {
    const hour = String(date.getUTCHours()).padStart(2, "0");
    const minute = String(date.getUTCMinutes()).padStart(2, "0");
    const second = String(date.getUTCSeconds()).padStart(2, "0");
    if (format === "finnish") {
        return `klo ${hour}.${minute}.${second}`;
    }
    if (format === "american") {
        const hour12 = date.getUTCHours() % 12 || 12;
        const period = date.getUTCHours() < 12 ? "AM" : "PM";
        return `${hour12}:${minute}:${second} ${period}`;
    }
    return `${hour}:${minute}:${second}`;
}

export function formatUnixDateTime(
    unixSeconds: number,
    format: DateTimeFormat,
): string {
    const date = new Date(unixSeconds * 1000);
    const calendarDate = date.toISOString().slice(0, 10);
    const separator =
        format === "finnish" ? " " : format === "iso" ? " " : ", ";
    return `${formatCalendarDate(calendarDate, format)}${separator}${formatTime(date, format)} UTC`;
}
