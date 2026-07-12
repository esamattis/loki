import { and, desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { useId } from "hono/jsx";
import {
    app,
    getAppContext,
    useAppContext,
    type AppRequestContext,
} from "../app";
import {
    Checkbox,
    FormActions,
    Input,
    NumberInput,
    Select,
    Textarea,
} from "../components/form";
import { ErrorList } from "../components/feedback";
import { Script } from "../components/helpers";
import { $assertElement } from "../utils";
import * as routes from "../routes";
import {
    aircrafts,
    gear,
    jumps,
    jumpsToGear,
    jumpsToJumpTypes,
    jumpTypes,
    locations,
} from "../schema";
import { LogbookPage } from "./layout";
import {
    altitudeInputValue,
    altitudeToMeters,
    altitudeUnitLabel,
} from "../options";

interface Resource {
    uuid: string;
    name: string;
}

interface JumpFormValues {
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
}

function isValidJumpDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}

function getToday(): string {
    return new Date().toISOString().slice(0, 10);
}

const JumpSchema = z.object({
    locationUuid: z.string().min(1, "Location is required"),
    aircraftUuid: z.string().min(1, "Aircraft is required"),
    jumpNumber: z.coerce
        .number()
        .int("Jump number must be a whole number")
        .positive("Jump number must be positive"),
    jumpDate: z.string().refine(isValidJumpDate, "Jump date must be valid"),
    exitAltitude: z.coerce
        .number()
        .int("Exit altitude must be a whole number")
        .positive("Exit altitude must be positive"),
    openingAltitude: z.coerce
        .number()
        .int("Opening altitude must be a whole number")
        .min(0, "Opening altitude cannot be negative"),
    freefallTime: z.coerce
        .number()
        .int("Freefall time must be a whole number")
        .min(0, "Freefall time cannot be negative"),
    description: z.string().trim().max(2_000).optional(),
    gearUuids: z.array(z.string()).default([]),
    jumpTypeUuids: z.array(z.string()).default([]),
});

function AvgSpeed(props: {
    altitudeUnits: "meters" | "feet";
    speedUnits: "kilometers-per-hour" | "meters-per-second";
    values: JumpFormValues;
}) {
    const exitAltitudeId = useId();
    const openingAltitudeId = useId();
    const freefallTimeId = useId();
    const avgSpeedId = useId();

    return (
        <>
            <NumberInput
                id={exitAltitudeId}
                name="exitAltitude"
                label={`Exit altitude (${altitudeUnitLabel(props.altitudeUnits)})`}
                min="1"
                required
                value={props.values.exitAltitude ?? ""}
            />
            <NumberInput
                id={openingAltitudeId}
                name="openingAltitude"
                label={`Opening altitude (${altitudeUnitLabel(props.altitudeUnits)})`}
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
                    props.altitudeUnits,
                    props.speedUnits,
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

function JumpForm(props: {
    values?: JumpFormValues;
    locations: Resource[];
    aircrafts: Resource[];
    gear: Resource[];
    jumpTypes: Resource[];
    errors?: string[];
    submitLabel: string;
}) {
    const values = props.values ?? {};
    const options = useAppContext().getUser().options;
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
                <Input
                    name="jumpDate"
                    label="Jump date"
                    type="date"
                    required
                    value={values.jumpDate ?? getToday()}
                />
                <NumberInput
                    name="jumpNumber"
                    label="Jump number"
                    min="1"
                    required
                    value={values.jumpNumber ?? ""}
                />
                <AvgSpeed
                    altitudeUnits={options.altitudeUnits}
                    speedUnits={options.speedUnits}
                    values={values}
                />
                <Select name="locationUuid" label="Location" required>
                    <option value="" disabled selected={!values.locationUuid}>
                        Select a location
                    </option>
                    {props.locations.map((location) => (
                        <option
                            value={location.uuid}
                            selected={location.uuid === values.locationUuid}
                        >
                            {location.name}
                        </option>
                    ))}
                </Select>
                <Select name="aircraftUuid" label="Aircraft" required>
                    <option value="" disabled selected={!values.aircraftUuid}>
                        Select an aircraft
                    </option>
                    {props.aircrafts.map((aircraft) => (
                        <option
                            value={aircraft.uuid}
                            selected={aircraft.uuid === values.aircraftUuid}
                        >
                            {aircraft.name}
                        </option>
                    ))}
                </Select>
            </div>
            <fieldset>
                <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Gear used
                </legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {props.gear.map((item) => (
                        <Checkbox
                            name="gearUuids"
                            value={item.uuid}
                            label={item.name}
                            checked={selectedGear.has(item.uuid)}
                        />
                    ))}
                </div>
            </fieldset>
            <fieldset>
                <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Jump types
                </legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {props.jumpTypes.map((item) => (
                        <Checkbox
                            name="jumpTypeUuids"
                            value={item.uuid}
                            label={item.name}
                            checked={selectedJumpTypes.has(item.uuid)}
                        />
                    ))}
                </div>
            </fieldset>
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

async function getJumpFormResources(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const [locationRows, aircraftRows, gearRows, jumpTypeRows] =
        await Promise.all([
            db
                .select({ uuid: locations.uuid, name: locations.name })
                .from(locations)
                .where(
                    and(
                        eq(locations.userUuid, userUuid),
                        eq(locations.archived, false),
                    ),
                )
                .orderBy(locations.name),
            db
                .select({ uuid: aircrafts.uuid, name: aircrafts.name })
                .from(aircrafts)
                .where(
                    and(
                        eq(aircrafts.userUuid, userUuid),
                        eq(aircrafts.archived, false),
                    ),
                )
                .orderBy(aircrafts.name),
            db
                .select({ uuid: gear.uuid, name: gear.name })
                .from(gear)
                .where(
                    and(eq(gear.userUuid, userUuid), eq(gear.archived, false)),
                )
                .orderBy(gear.name),
            db
                .select({ uuid: jumpTypes.uuid, name: jumpTypes.name })
                .from(jumpTypes)
                .where(
                    and(
                        eq(jumpTypes.userUuid, userUuid),
                        eq(jumpTypes.archived, false),
                    ),
                )
                .orderBy(jumpTypes.name),
        ]);

    return {
        locations: locationRows,
        aircrafts: aircraftRows,
        gear: gearRows,
        jumpTypes: jumpTypeRows,
    };
}

function DeleteJumpButton() {
    const buttonId = useId();
    return (
        <form method="post" className="flex">
            <input type="hidden" name="action" value="delete" />
            <button
                id={buttonId}
                type="submit"
                className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-4 py-2.5 font-medium text-red-600 shadow-sm transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/40 dark:border-red-800 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/40 dark:focus:ring-red-400/40"
            >
                Delete jump
            </button>
            <Script
                $deps={[$assertElement]}
                $args={[buttonId]}
                $exec={(buttonId) => {
                    const button = document.getElementById(buttonId);
                    $assertElement(button, HTMLButtonElement);
                    let state: "idle" | "ready" = "idle";
                    let timer: ReturnType<typeof setInterval> | null = null;
                    button.addEventListener("click", (event) => {
                        if (state === "ready") {
                            return;
                        }
                        event.preventDefault();
                        state = "ready";
                        button.disabled = true;
                        button.classList.add(
                            "opacity-50",
                            "cursor-not-allowed",
                            "border-red-500",
                            "bg-red-100",
                            "dark:bg-red-950/60",
                        );
                        let count = 3;
                        button.textContent = `Confirm delete (${count}s)`;
                        timer = setInterval(() => {
                            count -= 1;
                            if (count <= 0) {
                                if (timer) clearInterval(timer);
                                timer = null;
                                button.disabled = false;
                                button.classList.remove(
                                    "opacity-50",
                                    "cursor-not-allowed",
                                );
                                button.textContent = "Confirm delete";
                                return;
                            }
                            button.textContent = `Confirm delete (${count}s)`;
                        }, 1000);
                    });
                }}
            />
        </form>
    );
}

function JumpFormPage(props: {
    title: string;
    submitLabel: string;
    values?: JumpFormValues;
    errors?: string[];
    resources: Awaited<ReturnType<typeof getJumpFormResources>>;
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
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/60 dark:bg-red-950/20">
                    <p className="mb-3 text-sm font-medium text-red-700 dark:text-red-300">
                        Danger zone
                    </p>
                    <DeleteJumpButton />
                </div>
            )}
        </LogbookPage>
    );
}

function getJumpFormValues(formData: FormData): JumpFormValues {
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
    };
}

async function renderNewJump(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const options = getAppContext(c).getUser().options;
    const altitudeUnits = options.altitudeUnits;
    const { from } = routes.jumpNew.query(c);
    const latestJump = await db
        .select({ uuid: jumps.uuid, jumpNumber: jumps.jumpNumber })
        .from(jumps)
        .where(eq(jumps.userUuid, userUuid))
        .orderBy(desc(jumps.jumpNumber))
        .limit(1)
        .get();

    let values: JumpFormValues = {
        jumpNumber: String((latestJump?.jumpNumber ?? 0) + 1),
        jumpDate: getToday(),
    };
    const sourceJumpUuid = from ?? latestJump?.uuid;
    if (sourceJumpUuid) {
        const jump = await db
            .select()
            .from(jumps)
            .where(
                and(
                    eq(jumps.uuid, sourceJumpUuid),
                    eq(jumps.userUuid, userUuid),
                ),
            )
            .get();
        if (jump) {
            const [gearRows, jumpTypeRows] = await Promise.all([
                db
                    .select({ gearUuid: jumpsToGear.gearUuid })
                    .from(jumpsToGear)
                    .where(eq(jumpsToGear.jumpUuid, jump.uuid)),
                db
                    .select({ jumpTypeUuid: jumpsToJumpTypes.jumpTypeUuid })
                    .from(jumpsToJumpTypes)
                    .where(eq(jumpsToJumpTypes.jumpUuid, jump.uuid)),
            ]);
            values = {
                ...values,
                locationUuid: jump.locationUuid,
                aircraftUuid: jump.aircraftUuid,
                exitAltitude: altitudeInputValue(
                    jump.exitAltitude,
                    altitudeUnits,
                ),
                openingAltitude: altitudeInputValue(
                    jump.openingAltitude,
                    altitudeUnits,
                ),
                freefallTime: String(jump.freefallTime),
                description: jump.description ?? undefined,
                gearUuids: gearRows.map((item) => item.gearUuid),
                jumpTypeUuids: jumpTypeRows.map((item) => item.jumpTypeUuid),
            };
        }
    }

    return c.render(
        <JumpFormPage
            title="Add jump"
            submitLabel="Add jump"
            values={values}
            resources={await getJumpFormResources(c)}
        />,
    );
}

async function handleNewJump(c: AppRequestContext) {
    const formData = await c.req.formData();
    const raw = getJumpFormValues(formData);
    const result = JumpSchema.safeParse(raw);
    const resources = await getJumpFormResources(c);

    if (!result.success) {
        return c.render(
            <JumpFormPage
                title="Add jump"
                submitLabel="Add jump"
                errors={result.error.issues.map((issue) => issue.message)}
                values={raw}
                resources={resources}
            />,
        );
    }

    const userUuid = getAppContext(c).getUser().uuid;
    const options = getAppContext(c).getUser().options;
    const altitudeUnits = options.altitudeUnits;
    const ownsResources =
        resources.locations.some(
            (item) => item.uuid === result.data.locationUuid,
        ) &&
        resources.aircrafts.some(
            (item) => item.uuid === result.data.aircraftUuid,
        ) &&
        result.data.gearUuids.every((uuid) =>
            resources.gear.some((item) => item.uuid === uuid),
        ) &&
        result.data.jumpTypeUuids.every((uuid) =>
            resources.jumpTypes.some((item) => item.uuid === uuid),
        );
    if (!ownsResources) {
        return c.render(
            <JumpFormPage
                title="Add jump"
                submitLabel="Add jump"
                errors={[
                    "Choose locations, aircraft, gear, and jump types from your logbook",
                ]}
                values={raw}
                resources={resources}
            />,
        );
    }

    const db = getAppContext(c).db;
    const jumpUuid = crypto.randomUUID();
    await db.batch([
        db.insert(jumps).values({
            uuid: jumpUuid,
            userUuid,
            locationUuid: result.data.locationUuid,
            aircraftUuid: result.data.aircraftUuid,
            jumpNumber: result.data.jumpNumber,
            jumpDate: result.data.jumpDate,
            exitAltitude: altitudeToMeters(
                result.data.exitAltitude,
                altitudeUnits,
            ),
            openingAltitude: altitudeToMeters(
                result.data.openingAltitude,
                altitudeUnits,
            ),
            freefallTime: result.data.freefallTime,
            description: result.data.description || null,
        }),
        ...result.data.gearUuids.map((gearUuid) =>
            db.insert(jumpsToGear).values({ jumpUuid, gearUuid }),
        ),
        ...result.data.jumpTypeUuids.map((jumpTypeUuid) =>
            db.insert(jumpsToJumpTypes).values({ jumpUuid, jumpTypeUuid }),
        ),
    ]);
    return c.redirect(routes.logbook({}));
}

async function renderEditJump(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const options = getAppContext(c).getUser().options;
    const altitudeUnits = options.altitudeUnits;
    const { uuid } = routes.jumpEdit.params(c);
    if (!uuid) {
        return c.notFound();
    }
    const jump = await db
        .select()
        .from(jumps)
        .where(and(eq(jumps.uuid, uuid), eq(jumps.userUuid, userUuid)))
        .get();
    if (!jump) {
        return c.notFound();
    }
    const gearRows = await db
        .select({ gearUuid: jumpsToGear.gearUuid })
        .from(jumpsToGear)
        .where(eq(jumpsToGear.jumpUuid, uuid));
    const jumpTypeRows = await db
        .select({ jumpTypeUuid: jumpsToJumpTypes.jumpTypeUuid })
        .from(jumpsToJumpTypes)
        .where(eq(jumpsToJumpTypes.jumpUuid, uuid));
    return c.render(
        <JumpFormPage
            title={`Edit jump #${jump.jumpNumber}`}
            submitLabel="Save jump"
            values={{
                locationUuid: jump.locationUuid,
                aircraftUuid: jump.aircraftUuid,
                jumpNumber: String(jump.jumpNumber),
                jumpDate: jump.jumpDate,
                exitAltitude: altitudeInputValue(
                    jump.exitAltitude,
                    altitudeUnits,
                ),
                openingAltitude: altitudeInputValue(
                    jump.openingAltitude,
                    altitudeUnits,
                ),
                freefallTime: String(jump.freefallTime),
                description: jump.description ?? undefined,
                gearUuids: gearRows.map((item) => item.gearUuid),
                jumpTypeUuids: jumpTypeRows.map((item) => item.jumpTypeUuid),
            }}
            resources={await getJumpFormResources(c)}
            copyHref={routes.jumpNew({}, { from: jump.uuid })}
            canDelete
        />,
    );
}

async function handleEditJump(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const options = getAppContext(c).getUser().options;
    const altitudeUnits = options.altitudeUnits;
    const { uuid } = routes.jumpEdit.params(c);
    if (!uuid) {
        return c.notFound();
    }
    const existing = await db
        .select({ uuid: jumps.uuid })
        .from(jumps)
        .where(and(eq(jumps.uuid, uuid), eq(jumps.userUuid, userUuid)))
        .get();
    if (!existing) {
        return c.notFound();
    }

    const formData = await c.req.formData();
    if (formData.get("action") === "delete") {
        const deleted = await db
            .delete(jumps)
            .where(and(eq(jumps.uuid, uuid), eq(jumps.userUuid, userUuid)))
            .returning({ uuid: jumps.uuid })
            .get();
        return deleted ? c.redirect(routes.logbook({})) : c.notFound();
    }
    const raw = getJumpFormValues(formData);
    const result = JumpSchema.safeParse(raw);
    const resources = await getJumpFormResources(c);
    const formProps = {
        title: "Edit jump",
        submitLabel: "Save jump",
        values: raw,
        resources,
    };
    if (!result.success) {
        return c.render(
            <JumpFormPage
                {...formProps}
                errors={result.error.issues.map((issue) => issue.message)}
            />,
        );
    }
    const ownsResources =
        resources.locations.some(
            (item) => item.uuid === result.data.locationUuid,
        ) &&
        resources.aircrafts.some(
            (item) => item.uuid === result.data.aircraftUuid,
        ) &&
        result.data.gearUuids.every((gearUuid) =>
            resources.gear.some((item) => item.uuid === gearUuid),
        ) &&
        result.data.jumpTypeUuids.every((jumpTypeUuid) =>
            resources.jumpTypes.some((item) => item.uuid === jumpTypeUuid),
        );
    if (!ownsResources) {
        return c.render(
            <JumpFormPage
                {...formProps}
                errors={[
                    "Choose locations, aircraft, gear, and jump types from your logbook",
                ]}
            />,
        );
    }

    await db.batch([
        db
            .update(jumps)
            .set({
                locationUuid: result.data.locationUuid,
                aircraftUuid: result.data.aircraftUuid,
                jumpNumber: result.data.jumpNumber,
                jumpDate: result.data.jumpDate,
                exitAltitude: altitudeToMeters(
                    result.data.exitAltitude,
                    altitudeUnits,
                ),
                openingAltitude: altitudeToMeters(
                    result.data.openingAltitude,
                    altitudeUnits,
                ),
                freefallTime: result.data.freefallTime,
                description: result.data.description || null,
            })
            .where(eq(jumps.uuid, uuid)),
        db.delete(jumpsToGear).where(eq(jumpsToGear.jumpUuid, uuid)),
        db.delete(jumpsToJumpTypes).where(eq(jumpsToJumpTypes.jumpUuid, uuid)),
        ...result.data.gearUuids.map((gearUuid) =>
            db.insert(jumpsToGear).values({ jumpUuid: uuid, gearUuid }),
        ),
        ...result.data.jumpTypeUuids.map((jumpTypeUuid) =>
            db
                .insert(jumpsToJumpTypes)
                .values({ jumpUuid: uuid, jumpTypeUuid }),
        ),
    ]);
    return c.redirect(routes.logbook({}));
}

app.get(routes.jumpNew.route, renderNewJump);
app.post(routes.jumpNew.route, handleNewJump);
app.get(routes.jumpEdit.route, renderEditJump);
app.post(routes.jumpEdit.route, handleEditJump);
