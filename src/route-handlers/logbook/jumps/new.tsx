import { and, desc, eq } from "drizzle-orm";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import { altitudeInputValue, altitudeToMeters } from "@/options";
import {
    duplicateJumpNumberError,
    findJumpByNumber,
    getJumpFormResources,
    parseAndResolveJumpForm,
} from "@/route-handlers/logbook/jumps/helpers";
import {
    getToday,
    JumpFormPage,
    type JumpFormValues,
} from "@/route-handlers/logbook/jumps/form";
import * as routes from "@/routes";
import {
    jumps,
    jumpsToAircrafts,
    jumpsToGear,
    jumpsToJumpTypes,
} from "@/schema";

function existingJumpNumberNotice(jumpNumber: number, existingUuid: string) {
    return (
        <>
            Jump #{jumpNumber} already exists.{" "}
            <a
                href={routes.logbook.jumps.edit({ uuid: existingUuid })}
                className="font-medium underline"
            >
                Open existing jump
            </a>
        </>
    );
}

function splitQueryList(value: string | undefined): string[] {
    return value
        ? value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
        : [];
}

function applyJumpQueryPrefill(
    values: JumpFormValues,
    query: ReturnType<typeof routes.logbook.jumps.new.query>,
): JumpFormValues {
    const next = { ...values };
    for (const key of [
        "jumpDate",
        "jumpNumber",
        "exitAltitude",
        "openingAltitude",
        "freefallTime",
        "locationUuid",
        "description",
        "locationName",
        "aircraftName",
        "gearName",
        "jumpTypeName",
    ] as const) {
        if (query[key]) {
            next[key] = query[key];
        }
    }
    const gearUuids = splitQueryList(query.gearUuids);
    if (gearUuids.length > 0) {
        next.gearUuids = gearUuids;
    }
    const aircraftUuids = splitQueryList(query.aircraftUuids);
    if (aircraftUuids.length > 0) {
        next.aircraftUuids = aircraftUuids;
    }
    const jumpTypeUuids = splitQueryList(query.jumpTypeUuids);
    if (jumpTypeUuids.length > 0) {
        next.jumpTypeUuids = jumpTypeUuids;
    }
    return next;
}

export async function renderNewJump(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const altitudeUnits = getAppContext(c).getUser().options.altitudeUnits;
    const query = routes.logbook.jumps.new.query(c);
    const hasImagePrefill = Boolean(
        query.jumpDate ||
        query.jumpNumber ||
        query.exitAltitude ||
        query.openingAltitude ||
        query.freefallTime ||
        query.locationUuid ||
        query.aircraftUuids ||
        query.gearUuids ||
        query.jumpTypeUuids ||
        query.locationName ||
        query.aircraftName ||
        query.gearName ||
        query.jumpTypeName ||
        query.description,
    );
    const latestJump = await db
        .select({ uuid: jumps.uuid, jumpNumber: jumps.jumpNumber })
        .from(jumps)
        .where(eq(jumps.userUuid, userUuid))
        .orderBy(desc(jumps.jumpNumber))
        .limit(1)
        .get();
    const nextJumpNumber = String((latestJump?.jumpNumber ?? 0) + 1);
    let values: JumpFormValues = {
        jumpNumber: nextJumpNumber,
        jumpDate: getToday(),
    };
    const sourceJumpUuid =
        query.from ?? (hasImagePrefill ? undefined : latestJump?.uuid);
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
            const [aircraftRows, gearRows, jumpTypeRows] = await Promise.all([
                db
                    .select({ aircraftUuid: jumpsToAircrafts.aircraftUuid })
                    .from(jumpsToAircrafts)
                    .where(eq(jumpsToAircrafts.jumpUuid, jump.uuid)),
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
                locationUuid: jump.locationUuid ?? undefined,
                aircraftUuids: aircraftRows.map((item) => item.aircraftUuid),
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
    const notices: ReturnType<typeof existingJumpNumberNotice>[] = [];
    if (query.jumpNumber) {
        const jumpNumber = Number(query.jumpNumber);
        if (Number.isInteger(jumpNumber) && jumpNumber > 0) {
            const existingJump = await findJumpByNumber(c, jumpNumber);
            if (existingJump) {
                notices.push(
                    existingJumpNumberNotice(jumpNumber, existingJump.uuid),
                );
            }
        }
    }
    return c.render(
        <JumpFormPage
            title="Add jump"
            submitLabel="Add jump"
            confirmationTitle="Add Jump"
            values={values}
            nextJumpNumber={nextJumpNumber}
            notices={notices}
            resources={await getJumpFormResources(c)}
        />,
    );
}

async function getNextJumpNumber(
    c: AppRequestContext,
    userUuid: string,
): Promise<string> {
    const latestJump = await getAppContext(c)
        .db.select({ jumpNumber: jumps.jumpNumber })
        .from(jumps)
        .where(eq(jumps.userUuid, userUuid))
        .orderBy(desc(jumps.jumpNumber))
        .limit(1)
        .get();
    return String((latestJump?.jumpNumber ?? 0) + 1);
}

export async function handleNewJump(c: AppRequestContext) {
    const formData = await c.req.formData();
    const parsed = await parseAndResolveJumpForm(c, formData);
    const userUuid = getAppContext(c).getUser().uuid;
    if (!parsed.ok) {
        return c.render(
            <JumpFormPage
                title="Add jump"
                submitLabel="Add jump"
                confirmationTitle="Add Jump"
                errors={parsed.errors}
                values={parsed.raw}
                nextJumpNumber={await getNextJumpNumber(c, userUuid)}
                resources={parsed.resources}
            />,
        );
    }
    const altitudeUnits = getAppContext(c).getUser().options.altitudeUnits;
    const existingJump = await findJumpByNumber(c, parsed.data.jumpNumber);
    if (existingJump) {
        return c.render(
            <JumpFormPage
                title="Add jump"
                submitLabel="Add jump"
                confirmationTitle="Add Jump"
                errors={[
                    duplicateJumpNumberError(
                        parsed.data.jumpNumber,
                        existingJump.uuid,
                    ),
                ]}
                values={parsed.raw}
                nextJumpNumber={await getNextJumpNumber(c, userUuid)}
                resources={parsed.resources}
            />,
        );
    }
    const db = getAppContext(c).db;
    const jumpUuid = crypto.randomUUID();
    await db.batch([
        db.insert(jumps).values({
            uuid: jumpUuid,
            userUuid,
            locationUuid: parsed.resolved.locationUuid,
            jumpNumber: parsed.data.jumpNumber,
            jumpDate: parsed.data.jumpDate,
            exitAltitude: altitudeToMeters(
                parsed.data.exitAltitude,
                altitudeUnits,
            ),
            openingAltitude: altitudeToMeters(
                parsed.data.openingAltitude,
                altitudeUnits,
            ),
            freefallTime: parsed.data.freefallTime,
            description: parsed.data.description || null,
        }),
        ...parsed.resolved.aircraftUuids.map((aircraftUuid) =>
            db.insert(jumpsToAircrafts).values({ jumpUuid, aircraftUuid }),
        ),
        ...parsed.resolved.gearUuids.map((gearUuid) =>
            db.insert(jumpsToGear).values({ jumpUuid, gearUuid }),
        ),
        ...parsed.resolved.jumpTypeUuids.map((jumpTypeUuid) =>
            db.insert(jumpsToJumpTypes).values({ jumpUuid, jumpTypeUuid }),
        ),
    ]);
    return c.redirect(routes.logbook.index({}));
}

export function register(app: App) {
    app.get(routes.logbook.jumps.new.route, renderNewJump);
    app.post(routes.logbook.jumps.new.route, handleNewJump);
}
