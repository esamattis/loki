import { and, desc, eq } from "drizzle-orm";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import { Link } from "@/components/link";
import { altitudeInputValue, altitudeToMeters } from "@/options";
import {
    findJumpByNumber,
    getJumpFormResources,
    getJumpNumberConflict,
    JUMP_NUMBER_CONFLICT_REPLACE,
    JUMP_NUMBER_CONFLICT_SHIFT,
    jumpRelationDeletes,
    jumpRelationInserts,
    missingJumpNumberConflictError,
    parseAndResolveJumpForm,
    parseJumpNumberConflictAction,
    shiftJumpNumberQueries,
} from "@/route-handlers/logbook/jumps/helpers";
import {
    getToday,
    JumpFormPage,
    type JumpFormValues,
} from "@/route-handlers/logbook/jumps/form";
import { JumpNumberError } from "@/route-handlers/logbook/jumps/form/jump-number-field";
import { JumpImageAssociationComplete } from "@/route-handlers/logbook/jumps/image-created-client";
import { buildLogbookGoToJumpUrl } from "@/route-handlers/logbook/components/search";
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

function imageReadingWarningNotices(warning: string) {
    return [
        warning,
        <>
            Ambiguities can be fixed using the{" "}
            <Link href={`${routes.preferences({})}#jump-image-prompt`}>
                Image reading prompt
            </Link>
            , <Link href={`${routes.preferences({})}#openai`}>Preferences</Link>
            , and the per-image{" "}
            <Link
                href={`${routes.logbook.jumps.fromImage({})}#additional-context`}
            >
                Additional context
            </Link>
            .
        </>,
    ];
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
    const jumpNumberConflict = await getJumpNumberConflict(c, {
        value: query.jumpNumber,
    });
    return c.render(
        <JumpFormPage
            title="Add jump"
            submitLabel="Add jump"
            confirmationTitle="Add Jump"
            values={values}
            nextJumpNumber={nextJumpNumber}
            jumpNumberConflict={jumpNumberConflict}
            resources={await getJumpFormResources(c)}
            sourceImageId={query.imageId}
            isImagePrefill={isImagePrefill}
            notices={
                query.warning
                    ? imageReadingWarningNotices(query.warning)
                    : undefined
            }
            dirty={isImagePrefill}
        />,
    );
}

export async function renderJumpNumberError(c: AppRequestContext) {
    const query = routes.logbook.jumps.jumpNumberError.query(c);
    const conflict = await getJumpNumberConflict(c, {
        value: query.jumpNumber,
        excludeUuid: query.excludeJumpUuid,
    });
    return c.render(<JumpNumberError conflict={conflict} />);
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
    const conflictAction = parseJumpNumberConflictAction(
        formData.get("jumpNumberConflict"),
    );
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
                jumpNumberConflict={await getJumpNumberConflict(c, {
                    value: parsed.raw.jumpNumber,
                    selected: conflictAction,
                })}
                resources={parsed.resources}
                sourceImageId={sourceImageId}
                isImagePrefill={Boolean(sourceImageId)}
            />,
        );
    }
    const altitudeUnits = getAppContext(c).getUser().options.altitudeUnits;
    const existingJump = await findJumpByNumber(c, parsed.data.jumpNumber);
    if (existingJump && !conflictAction) {
        return c.render(
            <JumpFormPage
                title="Add jump"
                submitLabel="Add jump"
                confirmationTitle="Add Jump"
                errors={[missingJumpNumberConflictError()]}
                values={parsed.raw}
                nextJumpNumber={await getNextJumpNumber(c, userUuid)}
                jumpNumberConflict={{
                    jumpNumber: parsed.data.jumpNumber,
                    existingUuid: existingJump.uuid,
                }}
                resources={parsed.resources}
                sourceImageId={sourceImageId}
                isImagePrefill={Boolean(sourceImageId)}
            />,
        );
    }
    const db = getAppContext(c).db;
    const jumpValues = {
        locationUuid: parsed.resolved.locationUuid,
        jumpNumber: parsed.data.jumpNumber,
        jumpDate: parsed.data.jumpDate,
        exitAltitude: altitudeToMeters(parsed.data.exitAltitude, altitudeUnits),
        openingAltitude: altitudeToMeters(
            parsed.data.openingAltitude,
            altitudeUnits,
        ),
        freefallTime: parsed.data.freefallTime,
        description: parsed.data.description || null,
    };
    const links = {
        aircraftUuids: parsed.resolved.aircraftUuids,
        gearUuids: parsed.resolved.gearUuids,
        jumpTypeUuids: parsed.resolved.jumpTypeUuids,
    };
    let jumpUuid: string;
    if (existingJump && conflictAction === JUMP_NUMBER_CONFLICT_REPLACE) {
        jumpUuid = existingJump.uuid;
        await db.batch([
            db.update(jumps).set(jumpValues).where(eq(jumps.uuid, jumpUuid)),
            ...jumpRelationDeletes(db, jumpUuid),
            ...jumpRelationInserts(db, jumpUuid, links),
        ]);
    } else {
        jumpUuid = crypto.randomUUID();
        const writeQueries = [
            db.insert(jumps).values({
                uuid: jumpUuid,
                userUuid,
                createdAt: Math.floor(Date.now() / 1_000),
                ...jumpValues,
            }),
            ...jumpRelationInserts(db, jumpUuid, links),
        ] as const;
        await db.batch(
            existingJump && conflictAction === JUMP_NUMBER_CONFLICT_SHIFT
                ? [
                      ...shiftJumpNumberQueries(c, parsed.data.jumpNumber),
                      ...writeQueries,
                  ]
                : writeQueries,
        );
    }
    const redirectUrl = buildLogbookGoToJumpUrl(parsed.data.jumpNumber);
    if (sourceImageId) {
        return c.render(
            <JumpImageAssociationComplete
                change={{
                    action: "create",
                    imageId: sourceImageId,
                    jumpUuid,
                    jumpNumber: parsed.data.jumpNumber,
                }}
                redirectUrl={redirectUrl}
            />,
        );
    }
    return c.redirect(redirectUrl);
}

export function register(app: App) {
    app.get(routes.logbook.jumps.new.route, renderNewJump);
    app.get(routes.logbook.jumps.jumpNumberError.route, renderJumpNumberError);
    app.post(routes.logbook.jumps.new.route, handleNewJump);
}
