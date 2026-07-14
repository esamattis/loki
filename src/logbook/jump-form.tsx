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
import { ConfirmDeleteButton, DangerZone, Dialog } from "../components/ui";
import { Script } from "../components/helpers";
import { $assertElement } from "../utils";
import * as routes from "../routes";
import { LogbookPage } from "./layout";
import { altitudeUnitLabel } from "../options";

export interface Resource {
    uuid: string;
    name: string;
    archived: boolean;
}

function resourceLabel(item: Resource): string {
    return item.archived ? `${item.name} (Archived)` : item.name;
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

const FIELD_BUTTON_CLASS =
    "inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:focus:ring-indigo-400/40";

const FIELD_INPUT_CLASS =
    "block w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30";

const DIALOG_OPTION_CLASS =
    "rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:focus:ring-indigo-400/40";

function FreefallEstimateScript(props: {
    exitAltitudeId: string;
    openingAltitudeId: string;
    freefallTimeId: string;
    estimateDialogId: string;
    customSpeedId: string;
    customSpeedButtonId: string;
    altitudeUnits: "meters" | "feet";
}) {
    return (
        <Script
            $deps={[$assertElement]}
            $args={[
                props.exitAltitudeId,
                props.openingAltitudeId,
                props.freefallTimeId,
                props.estimateDialogId,
                props.customSpeedId,
                props.customSpeedButtonId,
                props.altitudeUnits,
            ]}
            $exec={(
                exitAltitudeId,
                openingAltitudeId,
                freefallTimeId,
                estimateDialogId,
                customSpeedId,
                customSpeedButtonId,
                altitudeUnits,
            ) => {
                const exitAltitude = document.getElementById(exitAltitudeId);
                const openingAltitude =
                    document.getElementById(openingAltitudeId);
                const freefallTime = document.getElementById(freefallTimeId);
                const estimateDialog =
                    document.getElementById(estimateDialogId);
                const customSpeed = document.getElementById(customSpeedId);
                const customSpeedButton =
                    document.getElementById(customSpeedButtonId);
                $assertElement(exitAltitude, HTMLInputElement);
                $assertElement(openingAltitude, HTMLInputElement);
                $assertElement(freefallTime, HTMLInputElement);
                $assertElement(estimateDialog, HTMLDialogElement);
                $assertElement(customSpeed, HTMLInputElement);
                $assertElement(customSpeedButton, HTMLButtonElement);

                function estimateFreefallTime(speedKmh: number) {
                    $assertElement(exitAltitude, HTMLInputElement);
                    $assertElement(openingAltitude, HTMLInputElement);
                    $assertElement(freefallTime, HTMLInputElement);
                    const exit = Number(exitAltitude.value);
                    const opening = Number(openingAltitude.value);
                    if (
                        !Number.isFinite(exit) ||
                        !Number.isFinite(opening) ||
                        !Number.isFinite(speedKmh) ||
                        speedKmh <= 0
                    ) {
                        return;
                    }
                    const distanceMeters =
                        Math.max(0, exit - opening) *
                        (altitudeUnits === "feet" ? 0.3048 : 1);
                    const metersPerSecond = speedKmh / 3.6;
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
                    const speedButton = target.closest("[data-speed-kmh]");
                    if (!(speedButton instanceof HTMLButtonElement)) {
                        return;
                    }
                    const speedKmh = Number(
                        speedButton.getAttribute("data-speed-kmh"),
                    );
                    estimateFreefallTime(speedKmh);
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
    altitudeUnits: "meters" | "feet";
}) {
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
                    required
                    value={props.value}
                    className={FIELD_INPUT_CLASS}
                />
                <button
                    id={estimateButtonId}
                    type="button"
                    className={FIELD_BUTTON_CLASS}
                >
                    Estimate
                </button>
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
                        data-speed-kmh="180"
                        className={DIALOG_OPTION_CLASS}
                    >
                        Belly · 180 km/h
                    </button>
                    <button
                        type="button"
                        data-speed-kmh="240"
                        className={DIALOG_OPTION_CLASS}
                    >
                        Freefly · 240 km/h
                    </button>
                    <button
                        type="button"
                        data-speed-kmh="80"
                        className={DIALOG_OPTION_CLASS}
                    >
                        Wingsuit · 80 km/h
                    </button>
                    <div className="mt-2 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                        <NumberInput
                            id={customSpeedId}
                            label="Custom speed (km/h)"
                            min="1"
                            value="180"
                            persist="freefall-speed-estimate"
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
                altitudeUnits={props.altitudeUnits}
            />
        </div>
    );
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
            <FreefallTimeField
                freefallTimeId={freefallTimeId}
                exitAltitudeId={exitAltitudeId}
                openingAltitudeId={openingAltitudeId}
                value={props.values.freefallTime ?? ""}
                altitudeUnits={options.altitudeUnits}
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
                    className="block w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30"
                />
                <button
                    id={buttonId}
                    type="button"
                    className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:focus:ring-indigo-400/40"
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
                    data-next-jump-number={props.nextJumpNumber}
                    className="block w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30"
                />
                <button
                    id={buttonId}
                    type="button"
                    className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:focus:ring-indigo-400/40"
                >
                    Next
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
                        input.value =
                            input.getAttribute("data-next-jump-number") ?? "";
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
                {props.items.map((item) => {
                    const isSelected = item.uuid === props.selectedUuid;
                    const hideArchived = item.archived && !isSelected;
                    return (
                        <option
                            value={item.uuid}
                            selected={isSelected}
                            hidden={hideArchived}
                            data-archived={item.archived ? "true" : undefined}
                        >
                            {resourceLabel(item)}
                        </option>
                    );
                })}
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
                {props.items.map((item) => {
                    const isSelected = props.selectedUuids.has(item.uuid);
                    const hideArchived = item.archived && !isSelected;
                    return (
                        <Checkbox
                            name={props.checkboxName}
                            value={item.uuid}
                            label={resourceLabel(item)}
                            checked={isSelected}
                            hidden={hideArchived}
                            data-archived={item.archived ? "true" : undefined}
                        />
                    );
                })}
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

function ToggleArchivedJumpItemsButton(props: {
    buttonId: string;
    formId: string;
}) {
    return (
        <>
            <button
                id={props.buttonId}
                type="button"
                className="text-sm font-medium text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                data-showing-archived="false"
            >
                Show archived items
            </button>
            <Script
                $deps={[$assertElement]}
                $args={[props.buttonId, props.formId]}
                $exec={(buttonId, formId) => {
                    const buttonEl = document.getElementById(buttonId);
                    const formEl = document.getElementById(formId);
                    $assertElement(buttonEl, HTMLButtonElement);
                    $assertElement(formEl, HTMLFormElement);
                    const button: HTMLButtonElement = buttonEl;
                    const form: HTMLFormElement = formEl;

                    function isArchivedItemInUse(element: HTMLElement) {
                        if (element instanceof HTMLOptionElement) {
                            return element.selected;
                        }
                        const checkbox = element.querySelector(
                            'input[type="checkbox"]',
                        );
                        return (
                            checkbox instanceof HTMLInputElement &&
                            checkbox.checked
                        );
                    }

                    function setArchivedItemsVisible(visible: boolean) {
                        for (const element of form.querySelectorAll(
                            '[data-archived="true"]',
                        )) {
                            if (!(element instanceof HTMLElement)) {
                                continue;
                            }
                            if (visible || isArchivedItemInUse(element)) {
                                element.hidden = false;
                            } else {
                                element.hidden = true;
                            }
                        }
                        button.dataset.showingArchived = visible
                            ? "true"
                            : "false";
                        button.textContent = visible
                            ? "Hide archived items"
                            : "Show archived items";
                    }

                    button.addEventListener("click", () => {
                        const showing =
                            button.dataset.showingArchived === "true";
                        setArchivedItemsVisible(!showing);
                    });
                }}
            />
        </>
    );
}

function JumpForm(props: {
    values?: JumpFormValues;
    locations: Resource[];
    aircrafts: Resource[];
    gear: Resource[];
    jumpTypes: Resource[];
    errors?: Child[];
    notices?: Child[];
    submitLabel: string;
    nextJumpNumber?: string;
}) {
    const values = props.values ?? {};
    const selectedGear = new Set(values.gearUuids ?? []);
    const selectedJumpTypes = new Set(values.jumpTypeUuids ?? []);
    const formId = useId();
    const showArchivedButtonId = useId();
    const hasArchivedItems =
        props.locations.some((item) => item.archived) ||
        props.aircrafts.some((item) => item.archived) ||
        props.gear.some((item) => item.archived) ||
        props.jumpTypes.some((item) => item.archived);

    return (
        <form
            id={formId}
            method="post"
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
            {hasArchivedItems && (
                <div>
                    <ToggleArchivedJumpItemsButton
                        buttonId={showArchivedButtonId}
                        formId={formId}
                    />
                </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
                <JumpDateField value={values.jumpDate ?? getToday()} />
                <JumpNumberField
                    value={values.jumpNumber ?? ""}
                    nextJumpNumber={props.nextJumpNumber}
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
                value={values.description}
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
}) {
    return (
        <LogbookPage title={props.title}>
            <JumpForm
                values={props.values}
                errors={props.errors}
                notices={props.notices}
                submitLabel={props.submitLabel}
                nextJumpNumber={props.nextJumpNumber}
                {...props.resources}
            />
            {props.copyHref && (
                <a
                    href={props.copyHref}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:focus:ring-indigo-400/40"
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
