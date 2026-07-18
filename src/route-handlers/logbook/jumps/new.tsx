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
import { JumpNumberError } from "@/route-handlers/logbook/jumps/form/jump-number-field";
import { JumpImageAssociationComplete } from "@/route-handlers/logbook/jumps/image-created-client";
import * as routes from "@/routes";
import {
    jumps,
    jumpsToAircrafts,
    jumpsToGear,
    jumpsToJumpTypes,
} from "@/schema";

function splitQueryList(value: string | undefined): string[] {
    return value
        ? value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
        : [];
}

function queryProvidesJumpItem(
    query: ReturnType<typeof routes.logbook.jumps.new.query>,
    uuidKey: "locationUuid" | "aircraftUuids" | "gearUuids" | "jumpTypeUuids",
    nameKey: "locationName" | "aircraftName" | "gearName" | "jumpTypeName",
): boolean {
    return Boolean(query[uuidKey] || query[nameKey]);
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
    const isImagePrefill = query.fromImage === "1";
    const hasImagePrefill = Boolean(
        isImagePrefill ||
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
        .select({
            uuid: jumps.uuid,
            jumpNumber: jumps.jumpNumber,
            locationUuid: jumps.locationUuid,
        })
        .from(jumps)
        .where(eq(jumps.userUuid, userUuid))
        .orderBy(desc(jumps.jumpNumber))
        .limit(1)
        .get();
    const nextJumpNumber = String((latestJump?.jumpNumber ?? 0) + 1);
    let values: JumpFormValues = isImagePrefill
        ? { jumpNumber: "", jumpDate: "" }
        : { jumpNumber: nextJumpNumber, jumpDate: getToday() };
    if (isImagePrefill && latestJump) {
        const [aircraftRows, gearRows, jumpTypeRows] = await Promise.all([
            db
                .select({ aircraftUuid: jumpsToAircrafts.aircraftUuid })
                .from(jumpsToAircrafts)
                .where(eq(jumpsToAircrafts.jumpUuid, latestJump.uuid)),
            db
                .select({ gearUuid: jumpsToGear.gearUuid })
                .from(jumpsToGear)
                .where(eq(jumpsToGear.jumpUuid, latestJump.uuid)),
            db
                .select({ jumpTypeUuid: jumpsToJumpTypes.jumpTypeUuid })
                .from(jumpsToJumpTypes)
                .where(eq(jumpsToJumpTypes.jumpUuid, latestJump.uuid)),
        ]);
        if (!queryProvidesJumpItem(query, "locationUuid", "locationName")) {
            values.locationUuid = latestJump.locationUuid ?? undefined;
        }
        if (!queryProvidesJumpItem(query, "aircraftUuids", "aircraftName")) {
            values.aircraftUuids = aircraftRows.map(
                (item) => item.aircraftUuid,
            );
        }
        if (!queryProvidesJumpItem(query, "gearUuids", "gearName")) {
            values.gearUuids = gearRows.map((item) => item.gearUuid);
        }
        if (!queryProvidesJumpItem(query, "jumpTypeUuids", "jumpTypeName")) {
            values.jumpTypeUuids = jumpTypeRows.map(
                (item) => item.jumpTypeUuid,
            );
        }
    }
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
                freefallTime:
                    jump.freefallTime === 0 ? "" : String(jump.freefallTime),
                description: jump.description ?? undefined,
                gearUuids: gearRows.map((item) => item.gearUuid),
                jumpTypeUuids: jumpTypeRows.map((item) => item.jumpTypeUuid),
            };
        }
    }
    if (hasImagePrefill) {
        values = applyJumpQueryPrefill(values, query);
    }
    const jumpNumberError = await getJumpNumberError(c, query.jumpNumber);
    return c.render(
        <JumpFormPage
            title="Add jump"
            submitLabel="Add jump"
            confirmationTitle="Add Jump"
            values={values}
            nextJumpNumber={nextJumpNumber}
            jumpNumberError={jumpNumberError}
            resources={await getJumpFormResources(c)}
            sourceImageId={query.imageId}
            isImagePrefill={isImagePrefill}
            dirty={isImagePrefill}
        />,
    );
}

async function getJumpNumberError(
    c: AppRequestContext,
    value: string | undefined,
) {
    if (!value || !/^\d+$/.test(value)) {
        return undefined;
    }
    const jumpNumber = Number(value);
    if (!Number.isSafeInteger(jumpNumber) || jumpNumber < 1) {
        return undefined;
    }
    const existingJump = await findJumpByNumber(c, jumpNumber);
    return existingJump
        ? duplicateJumpNumberError(jumpNumber, existingJump.uuid)
        : undefined;
}

export async function renderJumpNumberError(c: AppRequestContext) {
    const query = routes.logbook.jumps.jumpNumberError.query(c);
    const error = await getJumpNumberError(c, query.jumpNumber);
    return c.render(<JumpNumberError error={error} />);
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
    const sourceImageIdValue = formData.get("sourceImageId");
    const sourceImageId =
        typeof sourceImageIdValue === "string" && sourceImageIdValue
            ? sourceImageIdValue
            : undefined;
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
                sourceImageId={sourceImageId}
                isImagePrefill={Boolean(sourceImageId)}
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
                sourceImageId={sourceImageId}
                isImagePrefill={Boolean(sourceImageId)}
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
    if (sourceImageId) {
        return c.render(
            <JumpImageAssociationComplete
                change={{
                    action: "create",
                    imageId: sourceImageId,
                    jumpUuid,
                    jumpNumber: parsed.data.jumpNumber,
                }}
                redirectUrl={routes.logbook.index({})}
            />,
        );
    }
    return c.redirect(routes.logbook.index({}));
}

export function register(app: App) {
    app.get(routes.logbook.jumps.new.route, renderNewJump);
    app.get(routes.logbook.jumps.jumpNumberError.route, renderJumpNumberError);
    app.post(routes.logbook.jumps.new.route, handleNewJump);
}
