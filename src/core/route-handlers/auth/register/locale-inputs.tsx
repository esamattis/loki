import { useId } from "hono/jsx";
import { Script } from "@/core/components/script";
import { $select } from "@/core/utils";

function $setRegistrationLocalePreferences(containerId: string) {
    const container = $select.id(containerId, HTMLDivElement);

    const locale = navigator.language;
    const localeInfo = new Intl.Locale(locale).maximize();
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
        const input = $select.el(
            `[name="${name}"]`,
            HTMLInputElement,
            container,
        );
        input.value = value;
    }
}

export function RegistrationLocaleInputs() {
    const id = useId();
    return (
        <div id={id} hidden>
            <input type="hidden" name="dateTimeFormat" value="iso" />
            <input type="hidden" name="numberFormat" value="space-comma" />
            <Script
                $deps={[$select]}
                $args={[id]}
                $exec={$setRegistrationLocalePreferences}
            />
        </div>
    );
}
