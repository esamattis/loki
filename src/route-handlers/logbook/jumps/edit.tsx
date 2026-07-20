import { and, eq } from "drizzle-orm";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
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
    type JumpWriteLinks,
    type JumpWriteValues,
} from "@/route-handlers/logbook/jumps/helpers";
import { JumpFormPage } from "@/route-handlers/logbook/jumps/form";
import { JumpImageAssociationComplete } from "@/route-handlers/logbook/jumps/image-created-client";
import * as routes from "@/routes";
import {
    jumps,
    jumpsToAircrafts,
    jumpsToGear,
    jumpsToJumpTypes,
} from "@/schema";

export async function renderEditJump(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const altitudeUnits = getAppContext(c).getUser().options.altitudeUnits;
    const { uuid } = routes.logbook.jumps.edit.params(c);
    if (!uuid) return c.notFound();
    const jump = await db
        .select()
        .from(jumps)
        .where(and(eq(jumps.uuid, uuid), eq(jumps.userUuid, userUuid)))
        .get();
    if (!jump) return c.notFound();
    const [aircraftRows, gearRows, jumpTypeRows] = await Promise.all([
        db
            .select({ aircraftUuid: jumpsToAircrafts.aircraftUuid })
            .from(jumpsToAircrafts)
            .where(eq(jumpsToAircrafts.jumpUuid, uuid)),
        db
            .select({ gearUuid: jumpsToGear.gearUuid })
            .from(jumpsToGear)
            .where(eq(jumpsToGear.jumpUuid, uuid)),
        db
            .select({ jumpTypeUuid: jumpsToJumpTypes.jumpTypeUuid })
            .from(jumpsToJumpTypes)
            .where(eq(jumpsToJumpTypes.jumpUuid, uuid)),
    ]);
    return c.render(
        <JumpFormPage
            title={`Edit jump #${jump.jumpNumber}`}
            submitLabel="Save jump"
            confirmationTitle="Edit Jump"
            values={{
                locationUuid: jump.locationUuid ?? undefined,
                aircraftUuids: aircraftRows.map((item) => item.aircraftUuid),
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
                freefallTime:
                    jump.freefallTime === 0 ? "" : String(jump.freefallTime),
                description: jump.description ?? undefined,
                gearUuids: gearRows.map((item) => item.gearUuid),
                jumpTypeUuids: jumpTypeRows.map((item) => item.jumpTypeUuid),
            }}
            resources={await getJumpFormResources(c)}
            copyHref={routes.logbook.jumps.new({}, { from: jump.uuid })}
            jumpUuid={jump.uuid}
            excludeJumpUuid={jump.uuid}
            createdAt={jump.createdAt}
            redirectBackAfterPost
            canDelete
        />,
    );
}

async function saveEditedJump(
    c: AppRequestContext,
    options: {
        uuid: string;
        jumpValues: JumpWriteValues;
        links: JumpWriteLinks;
        conflictingJumpUuid?: string;
        replaceConflict: boolean;
        shiftConflict: boolean;
    },
) {
    const db = getAppContext(c).db;
    if (options.replaceConflict && options.conflictingJumpUuid) {
        await db.batch([
            db.delete(jumps).where(eq(jumps.uuid, options.conflictingJumpUuid)),
            db
                .update(jumps)
                .set(options.jumpValues)
                .where(eq(jumps.uuid, options.uuid)),
            ...jumpRelationDeletes(db, options.uuid),
            ...jumpRelationInserts(db, options.uuid, options.links),
        ]);
        return c.render(
            <JumpImageAssociationComplete
                changes={[
                    {
                        action: "delete",
                        jumpUuid: options.conflictingJumpUuid,
                    },
                    {
                        action: "update",
                        jumpUuid: options.uuid,
                        jumpNumber: options.jumpValues.jumpNumber,
                    },
                ]}
                redirectUrl={routes.logbook.index({})}
                returnAfterFormPost
            />,
        );
    }
    const writeQueries = [
        db
            .update(jumps)
            .set(options.jumpValues)
            .where(eq(jumps.uuid, options.uuid)),
        ...jumpRelationDeletes(db, options.uuid),
        ...jumpRelationInserts(db, options.uuid, options.links),
    ] as const;
    await db.batch(
        options.shiftConflict
            ? [
                  ...shiftJumpNumberQueries(c, options.jumpValues.jumpNumber),
                  ...writeQueries,
              ]
            : writeQueries,
    );
    return c.render(
        <JumpImageAssociationComplete
            change={{
                action: "update",
                jumpUuid: options.uuid,
                jumpNumber: options.jumpValues.jumpNumber,
            }}
            redirectUrl={routes.logbook.index({})}
            returnAfterFormPost
        />,
    );
}

export async function handleEditJump(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const altitudeUnits = getAppContext(c).getUser().options.altitudeUnits;
    const { uuid } = routes.logbook.jumps.edit.params(c);
    if (!uuid) return c.notFound();
    const existing = await db
        .select({ uuid: jumps.uuid, createdAt: jumps.createdAt })
        .from(jumps)
        .where(and(eq(jumps.uuid, uuid), eq(jumps.userUuid, userUuid)))
        .get();
    if (!existing) return c.notFound();
    const formData = await c.req.formData();
    if (formData.get("action") === "delete") {
        const deleted = await db
            .delete(jumps)
            .where(and(eq(jumps.uuid, uuid), eq(jumps.userUuid, userUuid)))
            .returning({ uuid: jumps.uuid })
            .get();
        return deleted
            ? c.render(
                  <JumpImageAssociationComplete
                      change={{ action: "delete", jumpUuid: uuid }}
                      redirectUrl={routes.logbook.index({})}
                  />,
              )
            : c.notFound();
    }
    const conflictAction = parseJumpNumberConflictAction(
        formData.get("jumpNumberConflict"),
    );
    const parsed = await parseAndResolveJumpForm(c, formData);
    const jumpNumber = parsed.raw.jumpNumber;
    if (!parsed.ok) {
        return c.render(
            <JumpFormPage
                title={`Edit jump #${jumpNumber}`}
                submitLabel="Save jump"
                confirmationTitle="Edit Jump"
                values={parsed.raw}
                resources={parsed.resources}
                errors={parsed.errors}
                jumpNumberConflict={await getJumpNumberConflict(c, {
                    value: parsed.raw.jumpNumber,
                    excludeUuid: uuid,
                    selected: conflictAction,
                })}
                excludeJumpUuid={uuid}
                createdAt={existing.createdAt}
                redirectBackAfterPost
            />,
        );
    }
    const conflictingJump = await findJumpByNumber(
        c,
        parsed.data.jumpNumber,
        uuid,
    );
    if (conflictingJump && !conflictAction) {
        return c.render(
            <JumpFormPage
                title={`Edit jump #${jumpNumber}`}
                submitLabel="Save jump"
                confirmationTitle="Edit Jump"
                values={parsed.raw}
                resources={parsed.resources}
                errors={[missingJumpNumberConflictError()]}
                jumpNumberConflict={{
                    jumpNumber: parsed.data.jumpNumber,
                    existingUuid: conflictingJump.uuid,
                }}
                excludeJumpUuid={uuid}
                createdAt={existing.createdAt}
                redirectBackAfterPost
            />,
        );
    }
    return saveEditedJump(c, {
        uuid,
        jumpValues: {
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
        },
        links: {
            aircraftUuids: parsed.resolved.aircraftUuids,
            gearUuids: parsed.resolved.gearUuids,
            jumpTypeUuids: parsed.resolved.jumpTypeUuids,
        },
        conflictingJumpUuid: conflictingJump?.uuid,
        replaceConflict:
            Boolean(conflictingJump) &&
            conflictAction === JUMP_NUMBER_CONFLICT_REPLACE,
        shiftConflict:
            Boolean(conflictingJump) &&
            conflictAction === JUMP_NUMBER_CONFLICT_SHIFT,
    });
}

export function register(app: App) {
    app.get(routes.logbook.jumps.edit.route, renderEditJump);
    app.post(routes.logbook.jumps.edit.route, handleEditJump);
}
