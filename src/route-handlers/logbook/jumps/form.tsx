import { useId, type Child } from "hono/jsx";
import { useAppContext, useDateFormatter, useSpeedFormatter } from "@/app/app";
import {
    Button,
    ButtonLink,
    buttonClassName,
    ClearableTextarea,
    controlClassName,
    Input,
    NumberInput,
} from "@/components/form";
import { ErrorList } from "@/components/feedback";
import { Link } from "@/components/link";
import { CopyIcon } from "@/components/icons";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { DangerZone } from "@/components/ui/danger-zone";
import { Dialog } from "@/components/ui/dialog";
import { Script } from "@/components/script";
import {
    JumpItemSelect,
    type JumpItemResource,
} from "@/components/jump-item-select";
import { $select } from "@/utils";
import * as routes from "@/routes";
import { LogbookPage } from "@/app/logbook-page";
import { DateInput } from "@/components/date-input";
import { RedirectBackAfterPost } from "@/components/return-after-form-post";
import { JumpImageSource } from "@/route-handlers/logbook/jumps/image-source";
import { JumpNumberField } from "@/route-handlers/logbook/jumps/form/jump-number-field";
import type { JumpNumberConflictAction } from "@/route-handlers/logbook/jumps/helpers";
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
    jumpNumberConflict?: string;
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
            $deps={[$select]}
            $args={[props]}
            $exec={(config) => {
                const exitAltitude = $select.id(
                    config.exitAltitudeId,
                    HTMLInputElement,
                );
                const openingAltitude = $select.id(
                    config.openingAltitudeId,
                    HTMLInputElement,
                );
                const freefallTime = $select.id(
                    config.freefallTimeId,
                    HTMLInputElement,
                );
                const estimateDialog = $select.id(
                    config.estimateDialogId,
                    HTMLDialogElement,
                );
                const customSpeed = $select.id(
                    config.customSpeedId,
                    HTMLInputElement,
                );
                const customSpeedButton = $select.id(
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
                $deps={[$select]}
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
                    const exitAltitude = $select.id(
                        config.exitAltitudeId,
                        HTMLInputElement,
                    );
                    const openingAltitude = $select.id(
                        config.openingAltitudeId,
                        HTMLInputElement,
                    );
                    const freefallTime = $select.id(
                        config.freefallTimeId,
                        HTMLInputElement,
                    );
                    const freefallDistance = $select.id(
                        config.freefallDistanceId,
                        HTMLOutputElement,
                    );
                    const avgSpeed = $select.id(
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
                            <Link href={routes.logbook.locations.index({})}>
                                Manage locations
                            </Link>{" "}
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
                                <Link href={routes.logbook.aircraft.index({})}>
                                    Manage aircraft
                                </Link>{" "}
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
                            <Link href={routes.logbook.gear.index({})}>
                                Manage gear
                            </Link>{" "}
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
                                <Link href={routes.logbook.jumpTypes.index({})}>
                                    Manage jump types
                                </Link>{" "}
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
    jumpNumberError?: Child;
    jumpNumberConflict?: {
        jumpNumber: number;
        existingUuid: string;
        selected?: JumpNumberConflictAction;
    };
    excludeJumpUuid?: string;
    dirty?: boolean;
    createdAt?: number;
    redirectBackAfterPost?: boolean;
}) {
    const values = props.values ?? {};
    const formatDate = useDateFormatter();

    return (
        <form
            id={props.formId}
            method="post"
            data-loki-confirm={props.confirmationTitle}
            data-loki-dirty={props.dirty ? "true" : undefined}
            className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
            {props.redirectBackAfterPost && <RedirectBackAfterPost />}
            <ErrorList
                errors={props.notices ?? []}
                className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
            />
            <ErrorList
                errors={props.errors ?? []}
                className="border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
            />
            <div className="grid gap-5 sm:grid-cols-2">
                <DateInput
                    label="Jump date"
                    name="jumpDate"
                    value={values.jumpDate ?? getToday()}
                    required
                    showToday
                />
                <JumpNumberField
                    value={values.jumpNumber ?? ""}
                    nextJumpNumber={props.nextJumpNumber}
                    error={props.jumpNumberError}
                    conflict={props.jumpNumberConflict}
                    excludeJumpUuid={props.excludeJumpUuid}
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
            <ClearableTextarea
                name="description"
                label="Notes"
                value={values.description}
            />
            {props.createdAt !== undefined && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Created at {formatDate(props.createdAt)}
                </p>
            )}
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
    jumpNumberError?: Child;
    jumpNumberConflict?: {
        jumpNumber: number;
        existingUuid: string;
        selected?: JumpNumberConflictAction;
    };
    excludeJumpUuid?: string;
    copyHref?: string;
    canDelete?: boolean;
    sourceImageId?: string;
    jumpUuid?: string;
    isImagePrefill?: boolean;
    dirty?: boolean;
    createdAt?: number;
    redirectBackAfterPost?: boolean;
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
                jumpNumberError={props.jumpNumberError}
                jumpNumberConflict={props.jumpNumberConflict}
                excludeJumpUuid={props.excludeJumpUuid}
                dirty={props.dirty}
                createdAt={props.createdAt}
                redirectBackAfterPost={props.redirectBackAfterPost}
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
        jumpNumberConflict: getValue("jumpNumberConflict"),
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
