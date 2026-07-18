import { and, eq } from "drizzle-orm";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import { altitudeInputValue, altitudeToMeters } from "@/options";
import {
    duplicateJumpNumberError,
    findJumpByNumber,
    getJumpFormResources,
    parseAndResolveJumpForm,
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
            canDelete
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
        .select({ uuid: jumps.uuid })
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
            />,
        );
    }
    const existingJump = await findJumpByNumber(
        c,
        parsed.data.jumpNumber,
        uuid,
    );
    if (existingJump) {
        return c.render(
            <JumpFormPage
                title={`Edit jump #${jumpNumber}`}
                submitLabel="Save jump"
                confirmationTitle="Edit Jump"
                values={parsed.raw}
                resources={parsed.resources}
                errors={[
                    duplicateJumpNumberError(
                        parsed.data.jumpNumber,
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
            })
            .where(eq(jumps.uuid, uuid)),
        db.delete(jumpsToGear).where(eq(jumpsToGear.jumpUuid, uuid)),
        db.delete(jumpsToAircrafts).where(eq(jumpsToAircrafts.jumpUuid, uuid)),
        db.delete(jumpsToJumpTypes).where(eq(jumpsToJumpTypes.jumpUuid, uuid)),
        ...parsed.resolved.aircraftUuids.map((aircraftUuid) =>
            db
                .insert(jumpsToAircrafts)
                .values({ jumpUuid: uuid, aircraftUuid }),
        ),
        ...parsed.resolved.gearUuids.map((gearUuid) =>
            db.insert(jumpsToGear).values({ jumpUuid: uuid, gearUuid }),
        ),
        ...parsed.resolved.jumpTypeUuids.map((jumpTypeUuid) =>
            db
                .insert(jumpsToJumpTypes)
                .values({ jumpUuid: uuid, jumpTypeUuid }),
        ),
    ]);
    return c.render(
        <JumpImageAssociationComplete
            change={{
                action: "update",
                jumpUuid: uuid,
                jumpNumber: parsed.data.jumpNumber,
            }}
            redirectUrl={routes.logbook.index({})}
        />,
    );
}

export function register(app: App) {
    app.get(routes.logbook.jumps.edit.route, renderEditJump);
    app.post(routes.logbook.jumps.edit.route, handleEditJump);
}
