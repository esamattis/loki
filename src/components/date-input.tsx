import { useId } from "hono/jsx";
import { useAppContext } from "@/app/app";
import { Button, controlClassName, labelClassName } from "@/components/form";
import { CalendarIcon } from "@/components/icons";
import { Script } from "@/components/script";
import { formatCalendarDate } from "@/date-time";
import type { UserOptions } from "@/options";
import { $select } from "@/utils";

function DateInputScript(props: {
    inputId: string;
    valueId: string;
    pickerId: string;
    pickerButtonId: string;
    todayButtonId: string;
    dateTimeFormat: UserOptions["dateTimeFormat"];
}) {
    return (
        <Script
            $deps={[$select]}
            $args={[props]}
            $exec={(config) => {
                const input = $select.id(config.inputId, HTMLInputElement);
                const value = $select.id(config.valueId, HTMLInputElement);
                const picker = $select.id(config.pickerId, HTMLInputElement);
                const pickerButton = $select.id(
                    config.pickerButtonId,
                    HTMLButtonElement,
                );
                const todayButton = $select.idOrNull(
                    config.todayButtonId,
                    HTMLButtonElement,
                );

                function toIsoDate(displayValue: string) {
                    if (config.dateTimeFormat === "iso") return displayValue;
                    const separator =
                        config.dateTimeFormat === "finnish" ? "." : "/";
                    const parts = displayValue.split(separator);
                    if (parts.length !== 3) return displayValue;
                    const [first, second, year] = parts;
                    const day =
                        config.dateTimeFormat === "american" ? second : first;
                    const month =
                        config.dateTimeFormat === "american" ? first : second;
                    if (!day || !month || !year) return displayValue;
                    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
                }

                function toDisplayDate(isoDate: string) {
                    const [year, month, day] = isoDate.split("-");
                    if (!year || !month || !day) return isoDate;
                    if (config.dateTimeFormat === "finnish") {
                        return `${Number(day)}.${Number(month)}.${year}`;
                    }
                    if (config.dateTimeFormat === "european") {
                        return `${day}/${month}/${year}`;
                    }
                    if (config.dateTimeFormat === "american") {
                        return `${month}/${day}/${year}`;
                    }
                    return isoDate;
                }

                input.addEventListener("input", () => {
                    value.value = toIsoDate(input.value);
                    picker.value = value.value;
                });
                picker.addEventListener("change", () => {
                    if (!picker.value) return;
                    value.value = picker.value;
                    input.value = toDisplayDate(picker.value);
                    input.dispatchEvent(new Event("input", { bubbles: true }));
                });
                pickerButton.addEventListener("click", () => {
                    picker.showPicker();
                });
                todayButton?.addEventListener("click", () => {
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, "0");
                    const day = String(now.getDate()).padStart(2, "0");
                    value.value = `${year}-${month}-${day}`;
                    input.value = toDisplayDate(value.value);
                    input.dispatchEvent(new Event("input", { bubbles: true }));
                });
            }}
        />
    );
}

export function DateInput(props: {
    label: string;
    name: string;
    value: string;
    required?: boolean;
    showToday?: boolean;
}) {
    const inputId = useId();
    const valueId = useId();
    const pickerId = useId();
    const pickerButtonId = useId();
    const todayButtonId = useId();
    const dateTimeFormat = useAppContext().getUser().options.dateTimeFormat;
    const placeholder =
        dateTimeFormat === "finnish"
            ? "D.M.YYYY"
            : dateTimeFormat === "european"
              ? "DD/MM/YYYY"
              : dateTimeFormat === "american"
                ? "MM/DD/YYYY"
                : "YYYY-MM-DD";
    const lowerCaseLabel = props.label.toLowerCase();
    const isJumpDate = props.name === "jumpDate";

    return (
        <div>
            <label htmlFor={inputId} className={labelClassName}>
                {props.label}
            </label>
            <div className="mt-1.5 flex gap-2">
                <input
                    id={inputId}
                    type="text"
                    inputMode="numeric"
                    data-loki-jump-date-input={isJumpDate ? "" : undefined}
                    placeholder={placeholder}
                    required={props.required}
                    value={formatCalendarDate(props.value, dateTimeFormat)}
                    className={controlClassName}
                />
                <input
                    id={valueId}
                    name={props.name}
                    type="hidden"
                    value={props.value}
                />
                <input
                    id={pickerId}
                    type="date"
                    data-loki-jump-date-picker={isJumpDate ? "" : undefined}
                    value={props.value}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="sr-only"
                />
                <Button
                    id={pickerButtonId}
                    type="button"
                    variant="secondary"
                    aria-label={`Choose ${lowerCaseLabel}`}
                    data-loki-tooltip={`Choose ${lowerCaseLabel}`}
                    className="shrink-0 px-3.5 py-2.5"
                >
                    <CalendarIcon className="h-5 w-5" />
                </Button>
                {props.showToday && (
                    <Button
                        id={todayButtonId}
                        type="button"
                        variant="secondary"
                        data-loki-tooltip={`Set ${lowerCaseLabel} to today`}
                        className="shrink-0 px-3.5 py-2.5 text-sm"
                    >
                        Today
                    </Button>
                )}
            </div>
            <DateInputScript
                inputId={inputId}
                valueId={valueId}
                pickerId={pickerId}
                pickerButtonId={pickerButtonId}
                todayButtonId={todayButtonId}
                dateTimeFormat={dateTimeFormat}
            />
        </div>
    );
}
