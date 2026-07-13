import { and, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { app, getAppContext, type AppRequestContext } from "../app";
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
import { altitudeInputValue, altitudeToMeters } from "../options";
import {
    getJumpFormValues,
    getToday,
    JumpFormPage,
    type JumpFormValues,
} from "./jump-form";

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

type JumpFormResources = Awaited<ReturnType<typeof getJumpFormResources>>;

function ownsJumpResources(
    resources: JumpFormResources,
    data: z.infer<typeof JumpSchema>,
) {
    return (
        resources.locations.some((item) => item.uuid === data.locationUuid) &&
        resources.aircrafts.some((item) => item.uuid === data.aircraftUuid) &&
        data.gearUuids.every((uuid) =>
            resources.gear.some((item) => item.uuid === uuid),
        ) &&
        data.jumpTypeUuids.every((uuid) =>
            resources.jumpTypes.some((item) => item.uuid === uuid),
        )
    );
}

async function findJumpByNumber(
    c: AppRequestContext,
    jumpNumber: number,
    excludeUuid?: string,
) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    return db
        .select({ uuid: jumps.uuid })
        .from(jumps)
        .where(
            and(
                eq(jumps.userUuid, userUuid),
                eq(jumps.jumpNumber, jumpNumber),
                ...(excludeUuid ? [ne(jumps.uuid, excludeUuid)] : []),
            ),
        )
        .get();
}

function duplicateJumpNumberError(jumpNumber: number, existingUuid: string) {
    return (
        <>
            Jump number {jumpNumber} is already used.{" "}
            <a
                href={routes.jumpEdit({ uuid: existingUuid })}
                className="font-medium underline"
            >
                Open existing jump
            </a>
        </>
    );
}

function splitQueryList(value: string | undefined): string[] {
    if (!value) {
        return [];
    }
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function applyJumpQueryPrefill(
    values: JumpFormValues,
    query: ReturnType<typeof routes.jumpNew.query>,
): JumpFormValues {
    const next = { ...values };
    if (query.jumpDate) {
        next.jumpDate = query.jumpDate;
    }
    if (query.jumpNumber) {
        next.jumpNumber = query.jumpNumber;
    }
    if (query.exitAltitude) {
        next.exitAltitude = query.exitAltitude;
    }
    if (query.openingAltitude) {
        next.openingAltitude = query.openingAltitude;
    }
    if (query.freefallTime) {
        next.freefallTime = query.freefallTime;
    }
    if (query.locationUuid) {
        next.locationUuid = query.locationUuid;
    }
    if (query.aircraftUuid) {
        next.aircraftUuid = query.aircraftUuid;
    }
    if (query.description) {
        next.description = query.description;
    }
    const gearUuids = splitQueryList(query.gearUuids);
    if (gearUuids.length > 0) {
        next.gearUuids = gearUuids;
    }
    const jumpTypeUuids = splitQueryList(query.jumpTypeUuids);
    if (jumpTypeUuids.length > 0) {
        next.jumpTypeUuids = jumpTypeUuids;
    }
    return next;
}

async function renderNewJump(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const options = getAppContext(c).getUser().options;
    const altitudeUnits = options.altitudeUnits;
    const query = routes.jumpNew.query(c);
    const { from } = query;
    const hasImagePrefill = Boolean(
        query.jumpDate ||
        query.jumpNumber ||
        query.exitAltitude ||
        query.openingAltitude ||
        query.freefallTime ||
        query.locationUuid ||
        query.aircraftUuid ||
        query.gearUuids ||
        query.jumpTypeUuids ||
        query.description,
    );
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
    const sourceJumpUuid =
        from ?? (hasImagePrefill ? undefined : latestJump?.uuid);
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
                jumpDate: jump.jumpDate,
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

    if (hasImagePrefill) {
        values = applyJumpQueryPrefill(values, query);
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
    const altitudeUnits = getAppContext(c).getUser().options.altitudeUnits;
    if (!ownsJumpResources(resources, result.data)) {
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

    const existingJump = await findJumpByNumber(c, result.data.jumpNumber);
    if (existingJump) {
        return c.render(
            <JumpFormPage
                title="Add jump"
                submitLabel="Add jump"
                errors={[
                    duplicateJumpNumberError(
                        result.data.jumpNumber,
                        existingJump.uuid,
                    ),
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
    if (!ownsJumpResources(resources, result.data)) {
        return c.render(
            <JumpFormPage
                {...formProps}
                errors={[
                    "Choose locations, aircraft, gear, and jump types from your logbook",
                ]}
            />,
        );
    }

    const existingJump = await findJumpByNumber(
        c,
        result.data.jumpNumber,
        uuid,
    );
    if (existingJump) {
        return c.render(
            <JumpFormPage
                {...formProps}
                errors={[
                    duplicateJumpNumberError(
                        result.data.jumpNumber,
                        existingJump.uuid,
                    ),
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
