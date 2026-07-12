import { and, desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { app, getAppContext, type AppRequestContext } from "../app";
import {
    Checkbox,
    FormActions,
    NumberInput,
    Select,
    Textarea,
} from "../components/form";
import { ErrorList } from "../components/feedback";
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

interface Resource {
    uuid: string;
    name: string;
}

interface JumpFormValues {
    locationUuid?: string;
    aircraftUuid?: string;
    jumpNumber?: string;
    exitAltitude?: string;
    openingAltitude?: string;
    freefallTime?: string;
    description?: string;
    gearUuids?: string[];
    jumpTypeUuids?: string[];
}

const JumpSchema = z.object({
    locationUuid: z.string().min(1, "Location is required"),
    aircraftUuid: z.string().min(1, "Aircraft is required"),
    jumpNumber: z.coerce
        .number()
        .int("Jump number must be a whole number")
        .positive("Jump number must be positive"),
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
    const selectedGear = new Set(values.gearUuids ?? []);
    const selectedJumpTypes = new Set(values.jumpTypeUuids ?? []);

    return (
        <form
            method="post"
            className="space-y-5 rounded-lg bg-white p-5 shadow-sm"
        >
            <ErrorList
                errors={props.errors ?? []}
                className="border-red-300 bg-red-50 text-red-800"
            />
            <div className="grid gap-5 sm:grid-cols-2">
                <NumberInput
                    name="jumpNumber"
                    label="Jump number"
                    min="1"
                    required
                    value={values.jumpNumber ?? ""}
                />
                <NumberInput
                    name="exitAltitude"
                    label="Exit altitude (m)"
                    min="1"
                    required
                    value={values.exitAltitude ?? ""}
                />
                <NumberInput
                    name="openingAltitude"
                    label="Opening altitude (m)"
                    min="0"
                    required
                    value={values.openingAltitude ?? ""}
                />
                <NumberInput
                    name="freefallTime"
                    label="Freefall time (s)"
                    min="0"
                    required
                    value={values.freefallTime ?? ""}
                />
                <Select
                    name="locationUuid"
                    label="Location"
                    required
                    defaultValue={values.locationUuid ?? ""}
                >
                    <option value="" disabled>
                        Select a location
                    </option>
                    {props.locations.map((location) => (
                        <option value={location.uuid}>{location.name}</option>
                    ))}
                </Select>
                <Select
                    name="aircraftUuid"
                    label="Aircraft"
                    required
                    defaultValue={values.aircraftUuid ?? ""}
                >
                    <option value="" disabled>
                        Select an aircraft
                    </option>
                    {props.aircrafts.map((aircraft) => (
                        <option value={aircraft.uuid}>{aircraft.name}</option>
                    ))}
                </Select>
            </div>
            <fieldset>
                <legend className="text-sm font-medium text-gray-700">
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
                <legend className="text-sm font-medium text-gray-700">
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

function JumpFormPage(props: {
    title: string;
    submitLabel: string;
    values?: JumpFormValues;
    errors?: string[];
    resources: Awaited<ReturnType<typeof getJumpFormResources>>;
    copyHref?: string;
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
                    className="inline-block rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                    Copy to new
                </a>
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
                exitAltitude: String(jump.exitAltitude),
                openingAltitude: String(jump.openingAltitude),
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
            exitAltitude: result.data.exitAltitude,
            openingAltitude: result.data.openingAltitude,
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
                exitAltitude: String(jump.exitAltitude),
                openingAltitude: String(jump.openingAltitude),
                freefallTime: String(jump.freefallTime),
                description: jump.description ?? undefined,
                gearUuids: gearRows.map((item) => item.gearUuid),
                jumpTypeUuids: jumpTypeRows.map((item) => item.jumpTypeUuid),
            }}
            resources={await getJumpFormResources(c)}
            copyHref={routes.jumpNew({}, { from: jump.uuid })}
        />,
    );
}

async function handleEditJump(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
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
                exitAltitude: result.data.exitAltitude,
                openingAltitude: result.data.openingAltitude,
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
