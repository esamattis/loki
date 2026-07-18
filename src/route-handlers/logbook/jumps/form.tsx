import { useId, type Child } from "hono/jsx";
import { useAppContext, useSpeedFormatter } from "@/app/app";
import {
    Button,
    ButtonLink,
    buttonClassName,
    controlClassName,
    Input,
    NumberInput,
    Textarea,
} from "@/components/form";
import { ErrorList } from "@/components/feedback";
import { CalendarIcon, CopyIcon } from "@/components/icons";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { DangerZone } from "@/components/ui/danger-zone";
import { Dialog } from "@/components/ui/dialog";
import { Script } from "@/components/script";
import {
    JumpItemSelect,
    type JumpItemResource,
} from "@/components/jump-item-select";
import { $elById } from "@/utils";
import * as routes from "@/routes";
import { LogbookPage } from "@/app/authenticated-page";
import { formatCalendarDate } from "@/date-time";
import { JumpImageSource } from "@/route-handlers/logbook/jumps/image-source";
import {
    altitudeUnitLabel,
    numberFormatLocale,
    speedConversionFactor,
    speedInputValue,
    speedUnitLabel,
    type UserOptions,
} from "@/options";

export type Resource = JumpItemResource;

export interface JumpFormValues {
    locationUuid?: string;
    aircraftUuids?: string[];
    jumpNumber?: string;
    jumpDate?: string;
    exitAltitude?: string;
    openingAltitude?: string;
    freefallTime?: string;
    description?: string;
    gearUuids?: string[];
    jumpTypeUuids?: string[];
    locationName?: string;
    aircraftName?: string;
    gearName?: string;
    jumpTypeName?: string;
}

function getToday(): string {
    return new Date().toISOString().slice(0, 10);
}

const FIELD_INPUT_CLASS = controlClassName;

const DIALOG_OPTION_CLASS = buttonClassName({
    variant: "secondary",
    className: "justify-start px-3.5 py-2.5 text-left text-sm",
});

function FreefallEstimateScript(props: {
    exitAltitudeId: string;
    openingAltitudeId: string;
    freefallTimeId: string;
    estimateDialogId: string;
    customSpeedId: string;
    customSpeedButtonId: string;
    altitudeUnits: UserOptions["altitudeUnits"];
    speedConversionFactor: string;
}) {
    return (
        <Script
            $deps={[$elById]}
            $args={[props]}
            $exec={(config) => {
                const exitAltitude = $elById(
                    config.exitAltitudeId,
                    HTMLInputElement,
                );
                const openingAltitude = $elById(
                    config.openingAltitudeId,
                    HTMLInputElement,
                );
                const freefallTime = $elById(
                    config.freefallTimeId,
                    HTMLInputElement,
                );
                const estimateDialog = $elById(
                    config.estimateDialogId,
                    HTMLDialogElement,
                );
                const customSpeed = $elById(
                    config.customSpeedId,
                    HTMLInputElement,
                );
                const customSpeedButton = $elById(
                    config.customSpeedButtonId,
                    HTMLButtonElement,
                );
                const conversionFactor = Number(config.speedConversionFactor);

                function estimateFreefallTime(speed: number) {
                    const exit = Number(exitAltitude.value);
                    const opening = Number(openingAltitude.value);
                    if (
                        !Number.isFinite(exit) ||
                        !Number.isFinite(opening) ||
                        !Number.isFinite(speed) ||
                        speed <= 0
                    ) {
                        return;
                    }
                    const distanceMeters =
                        Math.max(0, exit - opening) *
                        (config.altitudeUnits === "feet" ? 0.3048 : 1);
                    const metersPerSecond = speed / conversionFactor;
                    freefallTime.value = String(
                        Math.round(distanceMeters / metersPerSecond),
                    );
                    freefallTime.dispatchEvent(
                        new Event("input", { bubbles: true }),
                    );
                }

                estimateDialog.addEventListener("click", (event) => {
                    const target = event.target;
                    if (!(target instanceof Element)) {
                        return;
                    }
                    const speedButton = target.closest("[data-loki-speed]");
                    if (!(speedButton instanceof HTMLButtonElement)) {
                        return;
                    }
                    const speed = Number(
                        speedButton.getAttribute("data-loki-speed"),
                    );
                    estimateFreefallTime(speed);
                    estimateDialog.close();
                });

                customSpeedButton.addEventListener("click", () => {
                    estimateFreefallTime(Number(customSpeed.value));
                    estimateDialog.close();
                });
            }}
        />
    );
}

function FreefallTimeField(props: {
    freefallTimeId: string;
    exitAltitudeId: string;
    openingAltitudeId: string;
    value: string;
}) {
    const options = useAppContext().getUser().options;
    const formatSpeed = useSpeedFormatter();
    const estimateButtonId = useId();
    const estimateDialogId = useId();
    const customSpeedId = useId();
    const customSpeedButtonId = useId();

    return (
        <div>
            <label
                htmlFor={props.freefallTimeId}
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
                Freefall time (s)
            </label>
            <div className="mt-1.5 flex gap-2">
                <input
                    id={props.freefallTimeId}
                    name="freefallTime"
                    type="number"
                    min="0"
                    value={props.value}
                    className={FIELD_INPUT_CLASS}
                />
                <Button
                    id={estimateButtonId}
                    type="button"
                    variant="secondary"
                    data-loki-tooltip="Estimate freefall time based on exit and opening altitude"
                    className="shrink-0 px-3.5 py-2.5 text-sm"
                >
                    Estimate
                </Button>
            </div>
            <Dialog
                id={estimateDialogId}
                openButtonId={estimateButtonId}
                title="Estimate freefall time"
                description="Choose freefall type. Time is estimated from exit and opening altitude."
            >
                <div className="grid gap-2">
                    <button
                        type="button"
                        data-loki-speed={speedInputValue(
                            50,
                            options.speedUnits,
                        )}
                        className={DIALOG_OPTION_CLASS}
                    >
                        Belly · {formatSpeed(50)}
                    </button>
                    <button
                        type="button"
                        data-loki-speed={speedInputValue(
                            240 / 3.6,
                            options.speedUnits,
                        )}
                        className={DIALOG_OPTION_CLASS}
                    >
                        Freefly · {formatSpeed(240 / 3.6)}
                    </button>
                    <button
                        type="button"
                        data-loki-speed={speedInputValue(
                            80 / 3.6,
                            options.speedUnits,
                        )}
                        className={DIALOG_OPTION_CLASS}
                    >
                        Wingsuit · {formatSpeed(80 / 3.6)}
                    </button>
                    <div className="mt-2 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                        <NumberInput
                            id={customSpeedId}
                            label={`Custom speed (${speedUnitLabel(options.speedUnits)})`}
                            min="1"
                            step="any"
                            value={speedInputValue(50, options.speedUnits)}
                            persist={`freefall-speed-estimate-${options.speedUnits}`}
                        />
                        <button
                            id={customSpeedButtonId}
                            type="button"
                            className={DIALOG_OPTION_CLASS}
                        >
                            Use custom speed
                        </button>
                    </div>
                </div>
            </Dialog>
            <FreefallEstimateScript
                exitAltitudeId={props.exitAltitudeId}
                openingAltitudeId={props.openingAltitudeId}
                freefallTimeId={props.freefallTimeId}
                estimateDialogId={estimateDialogId}
                customSpeedId={customSpeedId}
                customSpeedButtonId={customSpeedButtonId}
                altitudeUnits={options.altitudeUnits}
                speedConversionFactor={String(
                    speedConversionFactor(options.speedUnits),
                )}
            />
        </div>
    );
}

function CalculatedValue(props: {
    id: string;
    labelId: string;
    label: string;
}) {
    return (
        <div>
            <span
                id={props.labelId}
                className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
                {props.label}
            </span>
            <output
                id={props.id}
                aria-labelledby={props.labelId}
                aria-live="polite"
                className="mt-1 block text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-100"
            >
                —
            </output>
        </div>
    );
}

function AvgSpeed(props: { values: JumpFormValues }) {
    const options = useAppContext().getUser().options;
    const exitAltitudeId = useId();
    const openingAltitudeId = useId();
    const freefallTimeId = useId();
    const freefallDistanceId = useId();
    const freefallDistanceLabelId = useId();
    const avgSpeedId = useId();
    const avgSpeedLabelId = useId();

    return (
        <>
            <NumberInput
                id={exitAltitudeId}
                name="exitAltitude"
                label={`Exit altitude (${altitudeUnitLabel(options.altitudeUnits)})`}
                min="1"
                value={props.values.exitAltitude ?? ""}
            />
            <NumberInput
                id={openingAltitudeId}
                name="openingAltitude"
                label={`Opening altitude (${altitudeUnitLabel(options.altitudeUnits)})`}
                min="0"
                value={props.values.openingAltitude ?? ""}
            />
            <FreefallTimeField
                freefallTimeId={freefallTimeId}
                exitAltitudeId={exitAltitudeId}
                openingAltitudeId={openingAltitudeId}
                value={props.values.freefallTime ?? ""}
            />
            <div className="col-span-full grid grid-cols-2 gap-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <CalculatedValue
                    id={freefallDistanceId}
                    labelId={freefallDistanceLabelId}
                    label="Freefall distance"
                />
                <CalculatedValue
                    id={avgSpeedId}
                    labelId={avgSpeedLabelId}
                    label="Average speed"
                />
            </div>
            <Script
                $deps={[$elById]}
                $args={[
                    {
                        exitAltitudeId,
                        openingAltitudeId,
                        freefallTimeId,
                        freefallDistanceId,
                        avgSpeedId,
                        altitudeUnits: options.altitudeUnits,
                        speedConversionFactor: String(
                            speedConversionFactor(options.speedUnits),
                        ),
                        speedUnitLabel: speedUnitLabel(options.speedUnits),
                        numberLocale: numberFormatLocale(options.numberFormat),
                    },
                ]}
                $exec={(config) => {
                    const exitAltitude = $elById(
                        config.exitAltitudeId,
                        HTMLInputElement,
                    );
                    const openingAltitude = $elById(
                        config.openingAltitudeId,
                        HTMLInputElement,
                    );
                    const freefallTime = $elById(
                        config.freefallTimeId,
                        HTMLInputElement,
                    );
                    const freefallDistance = $elById(
                        config.freefallDistanceId,
                        HTMLOutputElement,
                    );
                    const avgSpeed = $elById(
                        config.avgSpeedId,
                        HTMLOutputElement,
                    );
                    const conversionFactor = Number(
                        config.speedConversionFactor,
                    );

                    function updateFreefallStats() {
                        const exit = Number(exitAltitude.value);
                        const opening = Number(openingAltitude.value);
                        if (
                            exitAltitude.value === "" ||
                            openingAltitude.value === "" ||
                            !Number.isFinite(exit) ||
                            !Number.isFinite(opening)
                        ) {
                            freefallDistance.textContent = "—";
                            avgSpeed.textContent = "—";
                            return;
                        }

                        const distanceMeters =
                            Math.max(0, exit - opening) *
                            (config.altitudeUnits === "feet" ? 0.3048 : 1);
                        freefallDistance.textContent =
                            config.altitudeUnits === "feet"
                                ? `${Math.round(distanceMeters / 0.3048).toLocaleString(config.numberLocale)} ft`
                                : `${Math.round(distanceMeters).toLocaleString(config.numberLocale)} m`;

                        const time = Number(freefallTime.value);
                        if (
                            freefallTime.value === "" ||
                            !Number.isFinite(time) ||
                            time <= 0
                        ) {
                            avgSpeed.textContent = "—";
                            return;
                        }
                        const metersPerSecond = distanceMeters / time;
                        const convertedSpeed =
                            metersPerSecond * conversionFactor;
                        const formatted = convertedSpeed.toLocaleString(
                            config.numberLocale,
                            {
                                maximumFractionDigits:
                                    conversionFactor === 1 ? 1 : 0,
                            },
                        );
                        avgSpeed.textContent = `${formatted} ${config.speedUnitLabel}`;
                    }

                    for (const input of [
                        exitAltitude,
                        openingAltitude,
                        freefallTime,
                    ]) {
                        input.addEventListener("input", updateFreefallStats);
                    }
                    updateFreefallStats();
                }}
            />
        </>
    );
}

function JumpDateScript(props: {
    inputId: string;
    valueId: string;
    pickerId: string;
    pickerButtonId: string;
    buttonId: string;
    dateTimeFormat: UserOptions["dateTimeFormat"];
}) {
    return (
        <Script
            $deps={[$elById]}
            $args={[props]}
            $exec={(config) => {
                const input = $elById(config.inputId, HTMLInputElement);
                const value = $elById(config.valueId, HTMLInputElement);
                const picker = $elById(config.pickerId, HTMLInputElement);
                const pickerButton = $elById(
                    config.pickerButtonId,
                    HTMLButtonElement,
                );
                const button = $elById(config.buttonId, HTMLButtonElement);

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
                button.addEventListener("click", () => {
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

function JumpDateField(props: { value: string }) {
    const inputId = useId();
    const valueId = useId();
    const pickerId = useId();
    const pickerButtonId = useId();
    const buttonId = useId();
    const dateTimeFormat = useAppContext().getUser().options.dateTimeFormat;
    const placeholder =
        dateTimeFormat === "finnish"
            ? "D.M.YYYY"
            : dateTimeFormat === "european"
              ? "DD/MM/YYYY"
              : dateTimeFormat === "american"
                ? "MM/DD/YYYY"
                : "YYYY-MM-DD";

    return (
        <div>
            <label
                htmlFor={inputId}
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
                Jump date
            </label>
            <div className="mt-1.5 flex gap-2">
                <input
                    id={inputId}
                    type="text"
                    inputMode="numeric"
                    data-loki-jump-date-input
                    placeholder={placeholder}
                    required
                    value={formatCalendarDate(props.value, dateTimeFormat)}
                    className={FIELD_INPUT_CLASS}
                />
                <input
                    id={valueId}
                    name="jumpDate"
                    type="hidden"
                    value={props.value}
                />
                <input
                    id={pickerId}
                    type="date"
                    data-loki-jump-date-picker
                    value={props.value}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="sr-only"
                />
                <Button
                    id={pickerButtonId}
                    type="button"
                    variant="secondary"
                    aria-label="Choose jump date"
                    data-loki-tooltip="Choose jump date"
                    className="shrink-0 px-3.5 py-2.5"
                >
                    <CalendarIcon className="h-5 w-5" />
                </Button>
                <Button
                    id={buttonId}
                    type="button"
                    variant="secondary"
                    data-loki-tooltip="Set jump date to today"
                    className="shrink-0 px-3.5 py-2.5 text-sm"
                >
                    Today
                </Button>
            </div>
            <JumpDateScript
                inputId={inputId}
                valueId={valueId}
                pickerId={pickerId}
                pickerButtonId={pickerButtonId}
                buttonId={buttonId}
                dateTimeFormat={dateTimeFormat}
            />
        </div>
    );
}

function JumpNumberField(props: { value: string; nextJumpNumber?: string }) {
    const inputId = useId();
    const buttonId = useId();

    if (props.nextJumpNumber === undefined) {
        return (
            <NumberInput
                name="jumpNumber"
                label="Jump number"
                min="1"
                required
                value={props.value}
            />
        );
    }

    return (
        <div>
            <label
                htmlFor={inputId}
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
                Jump number
            </label>
            <div className="mt-1.5 flex gap-2">
                <input
                    id={inputId}
                    name="jumpNumber"
                    type="number"
                    min="1"
                    required
                    value={props.value}
                    data-loki-next-jump-number={props.nextJumpNumber}
                    className={FIELD_INPUT_CLASS}
                />
                <Button
                    id={buttonId}
                    type="button"
                    variant="secondary"
                    data-loki-tooltip="Set number to the next jump number. Ie. latest jump number + 1"
                    className="shrink-0 px-3.5 py-2.5 text-sm"
                >
                    Next
                </Button>
            </div>
            <Script
                $deps={[$elById]}
                $args={[inputId, buttonId]}
                $exec={(inputId, buttonId) => {
                    const input = $elById(inputId, HTMLInputElement);
                    const button = $elById(buttonId, HTMLButtonElement);
                    button.addEventListener("click", () => {
                        input.value =
                            input.getAttribute("data-loki-next-jump-number") ??
                            "";
                    });
                }}
            />
        </div>
    );
}

function ResourceSelectWithName(props: {
    selectName: string;
    selectLabel: string;
    description: Child;
    selectedUuid?: string;
    items: Resource[];
    nameField: string;
    nameLabel: string;
    nameValue?: string;
}) {
    return (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/40">
            <JumpItemSelect
                label={props.selectLabel}
                dialogTitle={`Select ${props.selectLabel.toLowerCase()}`}
                description={props.description}
                name={props.selectName}
                items={props.items}
                selectedUuids={
                    new Set(props.selectedUuid ? [props.selectedUuid] : [])
                }
            />
            <Input
                name={props.nameField}
                label={props.nameLabel}
                value={props.nameValue ?? ""}
                placeholder="Separate multiple names with ;"
            />
        </section>
    );
}

function JumpItemCheckboxFieldset(props: {
    legend: string;
    checkboxName: string;
    items: Resource[];
    selectedUuids: Set<string>;
    nameField: string;
    nameLabel: string;
    nameValue?: string;
    description?: Child;
}) {
    return (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/40">
            <JumpItemSelect
                label={props.legend}
                dialogTitle={`Select ${props.legend.toLowerCase()}`}
                name={props.checkboxName}
                items={props.items}
                selectedUuids={props.selectedUuids}
                multiple
                description={props.description}
            />
            <Input
                name={props.nameField}
                label={props.nameLabel}
                value={props.nameValue ?? ""}
                placeholder="Create or match by name"
            />
        </section>
    );
}

function JumpItemFields(props: {
    values: JumpFormValues;
    locations: Resource[];
    aircrafts: Resource[];
    gear: Resource[];
    jumpTypes: Resource[];
}) {
    return (
        <section className="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800">
            <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Jump items
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Select existing items or enter new names. Separate multiple
                    aircraft, gear, or jump types with ;.
                </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <ResourceSelectWithName
                    selectName="locationUuid"
                    selectLabel="Location"
                    description={
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Locations can be edited on the{" "}
                            <a
                                href={routes.logbook.locations.index({})}
                                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                                Manage locations
                            </a>{" "}
                            page.
                        </p>
                    }
                    selectedUuid={props.values.locationUuid}
                    items={props.locations}
                    nameField="locationName"
                    nameLabel="Or new location name"
                    nameValue={props.values.locationName}
                />
                <JumpItemCheckboxFieldset
                    legend="Aircraft"
                    checkboxName="aircraftUuids"
                    items={props.aircrafts}
                    selectedUuids={new Set(props.values.aircraftUuids ?? [])}
                    nameField="aircraftName"
                    nameLabel="New aircraft name"
                    nameValue={props.values.aircraftName}
                    description={
                        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                            <p>
                                Multiple aircraft can be selected, so aircraft
                                types and registration numbers can be tracked
                                individually. For example, &quot;Caravan&quot;
                                and &quot;OH-DZF&quot;.
                            </p>
                            <p>
                                Aircraft can be edited on the{" "}
                                <a
                                    href={routes.logbook.aircraft.index({})}
                                    className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                                >
                                    Manage aircraft
                                </a>{" "}
                                page.
                            </p>
                        </div>
                    }
                />
                <JumpItemCheckboxFieldset
                    legend="Gear used"
                    checkboxName="gearUuids"
                    items={props.gear}
                    selectedUuids={new Set(props.values.gearUuids ?? [])}
                    nameField="gearName"
                    nameLabel="New gear name"
                    nameValue={props.values.gearName}
                    description={
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Gear can be edited on the{" "}
                            <a
                                href={routes.logbook.gear.index({})}
                                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                                Manage gear
                            </a>{" "}
                            page.
                        </p>
                    }
                />
                <JumpItemCheckboxFieldset
                    legend="Jump types"
                    checkboxName="jumpTypeUuids"
                    items={props.jumpTypes}
                    selectedUuids={new Set(props.values.jumpTypeUuids ?? [])}
                    nameField="jumpTypeName"
                    nameLabel="New jump type name"
                    nameValue={props.values.jumpTypeName}
                    description={
                        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                            <p>
                                Multiple jump types can be selected, so roles
                                such as load organizer can be tracked on a
                                wingsuit jump. Jump types can also be used to
                                track cutaways and similar events.
                            </p>
                            <p>
                                Jump types can be edited on the{" "}
                                <a
                                    href={routes.logbook.jumpTypes.index({})}
                                    className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                                >
                                    Manage jump types
                                </a>{" "}
                                page.
                            </p>
                        </div>
                    }
                />
            </div>
        </section>
    );
}

function JumpForm(props: {
    formId: string;
    values?: JumpFormValues;
    locations: Resource[];
    aircrafts: Resource[];
    gear: Resource[];
    jumpTypes: Resource[];
    errors?: Child[];
    notices?: Child[];
    submitLabel: string;
    confirmationTitle: string;
    nextJumpNumber?: string;
    dirty?: boolean;
}) {
    const values = props.values ?? {};

    return (
        <form
            id={props.formId}
            method="post"
            data-loki-confirm={props.confirmationTitle}
            data-loki-dirty={props.dirty ? "true" : undefined}
            className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
            <ErrorList
                errors={props.notices ?? []}
                className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
            />
            <ErrorList
                errors={props.errors ?? []}
                className="border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
            />
            <div className="grid gap-5 sm:grid-cols-2">
                <JumpDateField value={values.jumpDate ?? getToday()} />
                <JumpNumberField
                    value={values.jumpNumber ?? ""}
                    nextJumpNumber={props.nextJumpNumber}
                />
                <AvgSpeed values={values} />
            </div>
            <JumpItemFields
                values={values}
                locations={props.locations}
                aircrafts={props.aircrafts}
                gear={props.gear}
                jumpTypes={props.jumpTypes}
            />
            <Textarea
                name="description"
                label="Notes"
                value={values.description}
            />
            <div className="hidden sm:block">
                <Button type="submit" variant="primary">
                    {props.submitLabel}
                </Button>
            </div>
        </form>
    );
}

export function JumpFormPage(props: {
    title: string;
    submitLabel: string;
    confirmationTitle: string;
    values?: JumpFormValues;
    errors?: Child[];
    notices?: Child[];
    resources: {
        locations: Resource[];
        aircrafts: Resource[];
        gear: Resource[];
        jumpTypes: Resource[];
    };
    nextJumpNumber?: string;
    copyHref?: string;
    canDelete?: boolean;
    sourceImageId?: string;
    jumpUuid?: string;
    isImagePrefill?: boolean;
    dirty?: boolean;
}) {
    const formId = useId();

    return (
        <LogbookPage
            title={props.title}
            mobileAction={
                <Button
                    type="submit"
                    form={formId}
                    variant="primary"
                    className="w-full"
                >
                    {props.submitLabel}
                </Button>
            }
        >
            {props.isImagePrefill && (
                <ButtonLink
                    href={routes.logbook.jumps.fromImage({})}
                    variant="secondary"
                >
                    Back to image reading
                </ButtonLink>
            )}
            {props.sourceImageId && (
                <JumpImageSource
                    imageId={props.sourceImageId}
                    title="Values read from this image"
                    formId={formId}
                />
            )}
            {props.jumpUuid && (
                <JumpImageSource
                    jumpUuid={props.jumpUuid}
                    title="Source image"
                />
            )}
            <JumpForm
                formId={formId}
                values={props.values}
                errors={props.errors}
                notices={props.notices}
                submitLabel={props.submitLabel}
                confirmationTitle={props.confirmationTitle}
                nextJumpNumber={props.nextJumpNumber}
                dirty={props.dirty}
                {...props.resources}
            />
            {props.copyHref && (
                <ButtonLink
                    href={props.copyHref}
                    icon={<CopyIcon className="h-4 w-4" />}
                    variant="secondary"
                    className="gap-1.5"
                >
                    Copy to new
                </ButtonLink>
            )}
            {props.canDelete && (
                <DangerZone>
                    <ConfirmDeleteButton label="Delete jump" />
                </DangerZone>
            )}
        </LogbookPage>
    );
}

export function getJumpFormValues(formData: FormData): JumpFormValues {
    function getValue(name: string): string {
        const value = formData.get(name);
        return typeof value === "string" ? value : "";
    }

    return {
        locationUuid: getValue("locationUuid"),
        aircraftUuids: formData
            .getAll("aircraftUuids")
            .filter((value): value is string => typeof value === "string"),
        jumpNumber: getValue("jumpNumber"),
        jumpDate: getValue("jumpDate"),
        exitAltitude: getValue("exitAltitude"),
        openingAltitude: getValue("openingAltitude"),
        freefallTime: getValue("freefallTime"),
        description: getValue("description"),
        gearUuids: formData
            .getAll("gearUuids")
            .filter((value): value is string => typeof value === "string"),
        jumpTypeUuids: formData
            .getAll("jumpTypeUuids")
            .filter((value): value is string => typeof value === "string"),
        locationName: getValue("locationName"),
        aircraftName: getValue("aircraftName"),
        gearName: getValue("gearName"),
        jumpTypeName: getValue("jumpTypeName"),
    };
}

export { getToday };
