import { and, eq, ne, sql } from "drizzle-orm";
import {
    getRequestContext,
    type AppRouter,
    type HonoRequestContext,
} from "@/core/create-app";
import {
    AircraftFormPage,
    getAircraftFormValues,
} from "@/app/logbook/aircraft/form";
import { getRecentJumpsForItem } from "@/app/logbook/components/jump-list";
import { ResourceSchema } from "@/app/logbook/components/resource";
import { getFormString } from "@/core/utils";
import * as routes from "@/app/routes";
import { aircrafts, jumpsToAircrafts } from "@/app/schema";

export function register(app: AppRouter) {
    app.get(routes.logbook.aircraft.edit, (c) => getEditAircraft(c));
    app.post(routes.logbook.aircraft.edit, updateAircraft);
}

async function getEditAircraft(c: HonoRequestContext, dangerError?: string) {
    const requestContext = getRequestContext(c);
    const { uuid } = routes.logbook.aircraft.edit.params(c);
    if (!uuid) return c.notFound();
    const aircraft = await requestContext.db
        .select()
        .from(aircrafts)
        .where(
            and(
                eq(aircrafts.uuid, uuid),
                eq(aircrafts.userUuid, requestContext.getUser().uuid),
            ),
        )
        .get();
    if (!aircraft) return c.notFound();
    const mergeOptions = await requestContext.db
        .select({ uuid: aircrafts.uuid, name: aircrafts.name })
        .from(aircrafts)
        .where(
            and(
                eq(aircrafts.userUuid, requestContext.getUser().uuid),
                ne(aircrafts.uuid, aircraft.uuid),
            ),
        )
        .orderBy(aircrafts.name);
    const [recentJumps, recordedUsageCount] = await Promise.all([
        getRecentJumpsForItem({
            c,
            userUuid: requestContext.getUser().uuid,
            itemUuid: aircraft.uuid,
            relation: "aircraft",
        }),
        getAircraftRecordedUsageCount(c, aircraft.uuid),
    ]);
    return c.render(
        <AircraftFormPage
            title="Edit aircraft"
            submitLabel="Save aircraft"
            values={{
                name: aircraft.name,
                previousCount: String(aircraft.previousJumpCount),
                description: aircraft.description ?? undefined,
            }}
            canDelete
            archived={aircraft.archived}
            dangerError={dangerError}
            mergeOptions={mergeOptions}
            recentJumps={recentJumps}
            recordedUsageCount={recordedUsageCount}
        />,
    );
}

async function updateAircraft(c: HonoRequestContext) {
    const requestContext = getRequestContext(c);
    const { uuid } = routes.logbook.aircraft.edit.params(c);
    if (!uuid) return c.notFound();
    const formData = await c.req.formData();
    if (formData.get("action") === "delete") {
        const usedByJump = await requestContext.db
            .select({ jumpUuid: jumpsToAircrafts.jumpUuid })
            .from(jumpsToAircrafts)
            .where(eq(jumpsToAircrafts.aircraftUuid, uuid))
            .limit(1)
            .get();
        if (usedByJump) {
            return getEditAircraft(
                c,
                "Cannot delete an aircraft that is used by jumps. Archive it instead.",
            );
        }
        const deleted = await requestContext.db
            .delete(aircrafts)
            .where(
                and(
                    eq(aircrafts.uuid, uuid),
                    eq(aircrafts.userUuid, requestContext.getUser().uuid),
                ),
            )
            .returning({ uuid: aircrafts.uuid })
            .get();
        return deleted
            ? c.redirect(routes.logbook.aircraft.index({}))
            : c.notFound();
    }
    if (formData.get("action") === "merge") {
        return mergeAircraft(c, uuid, getFormString(formData, "targetUuid"));
    }
    if (formData.get("action") === "toggleArchive") {
        const update = await requestContext.db
            .update(aircrafts)
            .set({ archived: formData.get("archived") === "true" })
            .where(
                and(
                    eq(aircrafts.uuid, uuid),
                    eq(aircrafts.userUuid, requestContext.getUser().uuid),
                ),
            )
            .returning({ uuid: aircrafts.uuid })
            .get();
        return update
            ? c.redirect(routes.logbook.aircraft.index({}))
            : c.notFound();
    }
    const values = getAircraftFormValues(formData);
    const result = ResourceSchema.safeParse(values);
    if (!result.success) {
        const [recentJumps, recordedUsageCount] = await Promise.all([
            getRecentJumpsForItem({
                c,
                userUuid: requestContext.getUser().uuid,
                itemUuid: uuid,
                relation: "aircraft",
            }),
            getAircraftRecordedUsageCount(c, uuid),
        ]);
        return c.render(
            <AircraftFormPage
                title="Edit aircraft"
                submitLabel="Save aircraft"
                values={values}
                recentJumps={recentJumps}
                recordedUsageCount={recordedUsageCount}
                errors={result.error.issues.map((issue) => issue.message)}
            />,
        );
    }
    const update = await requestContext.db
        .update(aircrafts)
        .set({
            name: result.data.name,
            previousJumpCount: result.data.previousCount,
            description: result.data.description || null,
        })
        .where(
            and(
                eq(aircrafts.uuid, uuid),
                eq(aircrafts.userUuid, requestContext.getUser().uuid),
            ),
        )
        .returning({ uuid: aircrafts.uuid })
        .get();
    return update
        ? c.redirect(routes.logbook.aircraft.index({}))
        : c.notFound();
}

async function mergeAircraft(
    c: HonoRequestContext,
    sourceUuid: string,
    targetUuid: string,
) {
    const requestContext = getRequestContext(c);
    if (!targetUuid || targetUuid === sourceUuid) {
        return getEditAircraft(c, "Select a different aircraft to merge into.");
    }
    const source = await requestContext.db
        .select()
        .from(aircrafts)
        .where(
            and(
                eq(aircrafts.uuid, sourceUuid),
                eq(aircrafts.userUuid, requestContext.getUser().uuid),
            ),
        )
        .get();
    const target = await requestContext.db
        .select()
        .from(aircrafts)
        .where(
            and(
                eq(aircrafts.uuid, targetUuid),
                eq(aircrafts.userUuid, requestContext.getUser().uuid),
            ),
        )
        .get();
    if (!source || !target) {
        return getEditAircraft(c, "Select a different aircraft to merge into.");
    }
    const sourceRelations = await requestContext.db
        .select({ jumpUuid: jumpsToAircrafts.jumpUuid })
        .from(jumpsToAircrafts)
        .where(eq(jumpsToAircrafts.aircraftUuid, source.uuid));
    await requestContext.db.batch([
        requestContext.db
            .delete(jumpsToAircrafts)
            .where(eq(jumpsToAircrafts.aircraftUuid, source.uuid)),
        ...sourceRelations.map((relation) =>
            requestContext.db
                .insert(jumpsToAircrafts)
                .values({
                    jumpUuid: relation.jumpUuid,
                    aircraftUuid: target.uuid,
                })
                .onConflictDoNothing(),
        ),
        requestContext.db
            .update(aircrafts)
            .set({
                previousJumpCount:
                    target.previousJumpCount + source.previousJumpCount,
            })
            .where(eq(aircrafts.uuid, target.uuid)),
        requestContext.db
            .delete(aircrafts)
            .where(eq(aircrafts.uuid, source.uuid)),
    ]);
    return c.redirect(routes.logbook.aircraft.edit({ uuid: target.uuid }));
}

async function getAircraftRecordedUsageCount(
    c: HonoRequestContext,
    aircraftUuid: string,
): Promise<number> {
    const row = await getRequestContext(c)
        .db.select({ count: sql<number>`count(*)` })
        .from(jumpsToAircrafts)
        .where(eq(jumpsToAircrafts.aircraftUuid, aircraftUuid))
        .get();
    return row?.count ?? 0;
}
