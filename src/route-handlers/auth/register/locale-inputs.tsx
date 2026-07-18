import { useId } from "hono/jsx";
import { Script } from "@/components/script";
import { $el, $elById } from "@/utils";
import { DEFAULT_USER_OPTIONS } from "@/options";

function $setRegistrationLocalePreferences(containerId: string) {
    const container = $elById(containerId, HTMLDivElement);

    const locale = navigator.language;
    const localeInfo = new Intl.Locale(locale).maximize();
    const imperial = ["US", "LR", "MM"].includes(localeInfo.region ?? "");
    const dateParts = new Intl.DateTimeFormat(locale).formatToParts(
        new Date(2026, 6, 14),
    );
    const dateOrder = dateParts
        .filter((part) => ["day", "month", "year"].includes(part.type))
        .map((part) => part.type);
    const numberParts = new Intl.NumberFormat(locale).formatToParts(12345.67);
    const group = numberParts.find((part) => part.type === "group")?.value;
    const decimal = numberParts.find((part) => part.type === "decimal")?.value;

    const values = {
        altitudeUnits: imperial ? "feet" : "meters",
        speedUnits: imperial ? "miles-per-hour" : "kilometers-per-hour",
        dateTimeFormat:
            localeInfo.language === "fi"
                ? "finnish"
                : dateOrder[0] === "month"
                  ? "american"
                  : dateOrder[0] === "year"
                    ? "iso"
                    : "european",
        numberFormat:
            group === "." && decimal === ","
                ? "period-comma"
                : group === "," && decimal === "."
                  ? "comma-period"
                  : "space-comma",
    };

    for (const [name, value] of Object.entries(values)) {
        const input = $el(`[name="${name}"]`, HTMLInputElement, container);
        input.value = value;
    }
}

export function RegistrationLocaleInputs() {
    const id = useId();
    return (
        <div id={id} hidden>
            <input
                type="hidden"
                name="altitudeUnits"
                value={DEFAULT_USER_OPTIONS.altitudeUnits}
            />
            <input
                type="hidden"
                name="speedUnits"
                value={DEFAULT_USER_OPTIONS.speedUnits}
            />
            <input
                type="hidden"
                name="dateTimeFormat"
                value={DEFAULT_USER_OPTIONS.dateTimeFormat}
            />
            <input
                type="hidden"
                name="numberFormat"
                value={DEFAULT_USER_OPTIONS.numberFormat}
            />
            <Script
                $deps={[$el, $elById]}
                $args={[id]}
                $exec={$setRegistrationLocalePreferences}
            />
        </div>
    );
}
