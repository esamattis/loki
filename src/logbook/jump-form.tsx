import { useId, type Child } from "hono/jsx";
import { useAppContext } from "../app";
import {
    Checkbox,
    FormActions,
    Input,
    NumberInput,
    Select,
    Textarea,
} from "../components/form";
import { ErrorList } from "../components/feedback";
import { ConfirmDeleteButton, DangerZone } from "../components/ui";
import { Script } from "../components/helpers";
import { $assertElement } from "../utils";
import * as routes from "../routes";
import { LogbookPage } from "./layout";
import { altitudeUnitLabel } from "../options";

export interface Resource {
    uuid: string;
    name: string;
}

export interface JumpFormValues {
    locationUuid?: string;
    aircraftUuid?: string;
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

function AvgSpeed(props: { values: JumpFormValues }) {
    const options = useAppContext().getUser().options;
    const exitAltitudeId = useId();
    const openingAltitudeId = useId();
    const freefallTimeId = useId();
    const avgSpeedId = useId();

    return (
        <>
            <NumberInput
                id={exitAltitudeId}
                name="exitAltitude"
                label={`Exit altitude (${altitudeUnitLabel(options.altitudeUnits)})`}
                min="1"
                required
                value={props.values.exitAltitude ?? ""}
            />
            <NumberInput
                id={openingAltitudeId}
                name="openingAltitude"
                label={`Opening altitude (${altitudeUnitLabel(options.altitudeUnits)})`}
                min="0"
                required
                value={props.values.openingAltitude ?? ""}
            />
            <NumberInput
                id={freefallTimeId}
                name="freefallTime"
                label="Freefall time (s)"
                min="0"
                required
                value={props.values.freefallTime ?? ""}
            />
            <div
                id={avgSpeedId}
                aria-live="polite"
                className="flex flex-col justify-end text-sm font-medium text-slate-700 dark:text-slate-300"
            >
                Avg speed: —
            </div>
            <Script
                $deps={[$assertElement]}
                $args={[
                    exitAltitudeId,
                    openingAltitudeId,
                    freefallTimeId,
                    avgSpeedId,
                    options.altitudeUnits,
                    options.speedUnits,
                ]}
                $exec={(
                    exitAltitudeId,
                    openingAltitudeId,
                    freefallTimeId,
                    avgSpeedId,
                    altitudeUnits,
                    speedUnits,
                ) => {
                    const exitAltitude =
                        document.getElementById(exitAltitudeId);
                    const openingAltitude =
                        document.getElementById(openingAltitudeId);
                    const freefallTime =
                        document.getElementById(freefallTimeId);
                    const avgSpeed = document.getElementById(avgSpeedId);
                    $assertElement(exitAltitude, HTMLInputElement);
                    $assertElement(openingAltitude, HTMLInputElement);
                    $assertElement(freefallTime, HTMLInputElement);
                    $assertElement(avgSpeed, HTMLDivElement);

                    function updateAvgSpeed() {
                        $assertElement(exitAltitude, HTMLInputElement);
                        $assertElement(openingAltitude, HTMLInputElement);
                        $assertElement(freefallTime, HTMLInputElement);
                        $assertElement(avgSpeed, HTMLDivElement);
                        const exit = Number(exitAltitude.value);
                        const opening = Number(openingAltitude.value);
                        const time = Number(freefallTime.value);
                        if (
                            !Number.isFinite(exit) ||
                            !Number.isFinite(opening) ||
                            !Number.isFinite(time) ||
                            time <= 0
                        ) {
                            avgSpeed.textContent = "Avg speed: —";
                            return;
                        }

                        const metersPerSecond =
                            (Math.max(0, exit - opening) *
                                (altitudeUnits === "feet" ? 0.3048 : 1)) /
                            time;
                        const formatted =
                            speedUnits === "meters-per-second"
                                ? `${metersPerSecond.toFixed(1).replace(/\.0$/, "")} m/s`
                                : `${Math.round(metersPerSecond * 3.6)} km/h`;
                        avgSpeed.textContent = `Avg speed: ${formatted}`;
                    }

                    for (const input of [
                        exitAltitude,
                        openingAltitude,
                        freefallTime,
                    ]) {
                        input.addEventListener("input", updateAvgSpeed);
                    }
                    updateAvgSpeed();
                }}
            />
        </>
    );
}

function JumpDateField(props: { value: string }) {
    const inputId = useId();
    const buttonId = useId();

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
                    name="jumpDate"
                    type="date"
                    required
                    value={props.value}
                    className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30"
                />
                <button
                    id={buttonId}
                    type="button"
                    className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-indigo-400/40"
                >
                    Today
                </button>
            </div>
            <Script
                $deps={[$assertElement]}
                $args={[inputId, buttonId]}
                $exec={(inputId, buttonId) => {
                    const input = document.getElementById(inputId);
                    const button = document.getElementById(buttonId);
                    $assertElement(input, HTMLInputElement);
                    $assertElement(button, HTMLButtonElement);
                    button.addEventListener("click", () => {
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = String(now.getMonth() + 1).padStart(
                            2,
                            "0",
                        );
                        const day = String(now.getDate()).padStart(2, "0");
                        input.value = `${year}-${month}-${day}`;
                    });
                }}
            />
        </div>
    );
}

function ResourceSelectWithName(props: {
    selectName: string;
    selectLabel: string;
    selectedUuid?: string;
    items: Resource[];
    nameField: string;
    nameLabel: string;
    nameValue?: string;
}) {
    return (
        <div className="space-y-3">
            <Select name={props.selectName} label={props.selectLabel}>
                <option value="" selected={!props.selectedUuid}>
                    Select a {props.selectLabel.toLowerCase()}
                </option>
                {props.items.map((item) => (
                    <option
                        value={item.uuid}
                        selected={item.uuid === props.selectedUuid}
                    >
                        {item.name}
                    </option>
                ))}
            </Select>
            <Input
                name={props.nameField}
                label={props.nameLabel}
                value={props.nameValue ?? ""}
                placeholder="Create or match by name"
            />
        </div>
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
}) {
    return (
        <fieldset>
            <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {props.legend}
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {props.items.map((item) => (
                    <Checkbox
                        name={props.checkboxName}
                        value={item.uuid}
                        label={item.name}
                        checked={props.selectedUuids.has(item.uuid)}
                    />
                ))}
            </div>
            <div className="mt-3">
                <Input
                    name={props.nameField}
                    label={props.nameLabel}
                    value={props.nameValue ?? ""}
                    placeholder="Create or match by name"
                />
            </div>
        </fieldset>
    );
}

function JumpForm(props: {
    values?: JumpFormValues;
    locations: Resource[];
    aircrafts: Resource[];
    gear: Resource[];
    jumpTypes: Resource[];
    errors?: Child[];
    submitLabel: string;
}) {
    const values = props.values ?? {};
    const selectedGear = new Set(values.gearUuids ?? []);
    const selectedJumpTypes = new Set(values.jumpTypeUuids ?? []);

    return (
        <form
            method="post"
            className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
            <ErrorList
                errors={props.errors ?? []}
                className="border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
            />
            <div className="grid gap-5 sm:grid-cols-2">
                <JumpDateField value={values.jumpDate ?? getToday()} />
                <NumberInput
                    name="jumpNumber"
                    label="Jump number"
                    min="1"
                    required
                    value={values.jumpNumber ?? ""}
                />
                <AvgSpeed values={values} />
                <ResourceSelectWithName
                    selectName="locationUuid"
                    selectLabel="Location"
                    selectedUuid={values.locationUuid}
                    items={props.locations}
                    nameField="locationName"
                    nameLabel="Or new location name"
                    nameValue={values.locationName}
                />
                <ResourceSelectWithName
                    selectName="aircraftUuid"
                    selectLabel="Aircraft"
                    selectedUuid={values.aircraftUuid}
                    items={props.aircrafts}
                    nameField="aircraftName"
                    nameLabel="Or new aircraft name"
                    nameValue={values.aircraftName}
                />
            </div>
            <JumpItemCheckboxFieldset
                legend="Gear used"
                checkboxName="gearUuids"
                items={props.gear}
                selectedUuids={selectedGear}
                nameField="gearName"
                nameLabel="New gear name"
                nameValue={values.gearName}
            />
            <JumpItemCheckboxFieldset
                legend="Jump types"
                checkboxName="jumpTypeUuids"
                items={props.jumpTypes}
                selectedUuids={selectedJumpTypes}
                nameField="jumpTypeName"
                nameLabel="New jump type name"
                nameValue={values.jumpTypeName}
            />
            <Textarea
                name="description"
                label="Notes"
                defaultValue={values.description}
            />
            <FormActions
                submitLabel={props.submitLabel}
                cancelHref={routes.logbook({})}
            />
        </form>
    );
}

export function JumpFormPage(props: {
    title: string;
    submitLabel: string;
    values?: JumpFormValues;
    errors?: Child[];
    resources: {
        locations: Resource[];
        aircrafts: Resource[];
        gear: Resource[];
        jumpTypes: Resource[];
    };
    copyHref?: string;
    canDelete?: boolean;
}) {
    return (
        <LogbookPage title={props.title}>
            <JumpForm
                values={props.values}
                errors={props.errors}
                submitLabel={props.submitLabel}
                {...props.resources}
            />
            {props.copyHref && (
                <a
                    href={props.copyHref}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-indigo-400/40"
                >
                    <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                    </svg>
                    Copy to new
                </a>
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
        aircraftUuid: getValue("aircraftUuid"),
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
