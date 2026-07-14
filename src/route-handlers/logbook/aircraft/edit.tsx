import { and, eq, ne } from "drizzle-orm";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import {
    AircraftFormPage,
    getAircraftFormValues,
} from "@/route-handlers/logbook/aircraft/form";
import { getRecentJumpsForItem } from "@/route-handlers/logbook/components/jump-list";
import { ResourceSchema } from "@/route-handlers/logbook/components/resource";
import { getFormString } from "@/utils";
import * as routes from "@/routes";
import { aircrafts, jumps } from "@/schema";

export function register(app: App) {
    app.get(routes.logbook.aircraft.edit.route, (c) => getEditAircraft(c));
    app.post(routes.logbook.aircraft.edit.route, updateAircraft);
}

async function getEditAircraft(c: AppRequestContext, dangerError?: string) {
    const app = getAppContext(c);
    const { uuid } = routes.logbook.aircraft.edit.params(c);
    if (!uuid) return c.notFound();
    const aircraft = await app.db
        .select()
        .from(aircrafts)
        .where(
            and(
                eq(aircrafts.uuid, uuid),
                eq(aircrafts.userUuid, app.getUser().uuid),
            ),
        )
        .get();
    if (!aircraft) return c.notFound();
    const mergeOptions = await app.db
        .select({ uuid: aircrafts.uuid, name: aircrafts.name })
        .from(aircrafts)
        .where(
            and(
                eq(aircrafts.userUuid, app.getUser().uuid),
                ne(aircrafts.uuid, aircraft.uuid),
            ),
        )
        .orderBy(aircrafts.name);
    const recentJumps = await getRecentJumpsForItem(
        c,
        app.getUser().uuid,
        app.getUser().options,
        aircraft.uuid,
        "aircraft",
    );
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
            dangerError={dangerError}
            mergeOptions={mergeOptions}
            recentJumps={recentJumps}
        />,
    );
}

async function updateAircraft(c: AppRequestContext) {
    const app = getAppContext(c);
    const { uuid } = routes.logbook.aircraft.edit.params(c);
    if (!uuid) return c.notFound();
    const formData = await c.req.formData();
    if (formData.get("action") === "delete") {
        const usedByJump = await app.db
            .select({ uuid: jumps.uuid })
            .from(jumps)
            .where(eq(jumps.aircraftUuid, uuid))
            .limit(1)
            .get();
        if (usedByJump) {
            return getEditAircraft(
                c,
                "Cannot delete an aircraft that is used by jumps. Archive it instead.",
            );
        }
        const deleted = await app.db
            .delete(aircrafts)
            .where(
                and(
                    eq(aircrafts.uuid, uuid),
                    eq(aircrafts.userUuid, app.getUser().uuid),
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
        const update = await app.db
            .update(aircrafts)
            .set({ archived: formData.get("archived") === "true" })
            .where(
                and(
                    eq(aircrafts.uuid, uuid),
                    eq(aircrafts.userUuid, app.getUser().uuid),
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
        const recentJumps = await getRecentJumpsForItem(
            c,
            app.getUser().uuid,
            app.getUser().options,
            uuid,
            "aircraft",
        );
        return c.render(
            <AircraftFormPage
                title="Edit aircraft"
                submitLabel="Save aircraft"
                values={values}
                recentJumps={recentJumps}
                errors={result.error.issues.map((issue) => issue.message)}
            />,
        );
    }
    const update = await app.db
        .update(aircrafts)
        .set({
            name: result.data.name,
            previousJumpCount: result.data.previousCount,
            description: result.data.description || null,
        })
        .where(
            and(
                eq(aircrafts.uuid, uuid),
                eq(aircrafts.userUuid, app.getUser().uuid),
            ),
        )
        .returning({ uuid: aircrafts.uuid })
        .get();
    return update
        ? c.redirect(routes.logbook.aircraft.index({}))
        : c.notFound();
}

async function mergeAircraft(
    c: AppRequestContext,
    sourceUuid: string,
    targetUuid: string,
) {
    const app = getAppContext(c);
    if (!targetUuid || targetUuid === sourceUuid) {
        return getEditAircraft(c, "Select a different aircraft to merge into.");
    }
    const source = await app.db
        .select()
        .from(aircrafts)
        .where(
            and(
                eq(aircrafts.uuid, sourceUuid),
                eq(aircrafts.userUuid, app.getUser().uuid),
            ),
        )
        .get();
    const target = await app.db
        .select()
        .from(aircrafts)
        .where(
            and(
                eq(aircrafts.uuid, targetUuid),
                eq(aircrafts.userUuid, app.getUser().uuid),
            ),
        )
        .get();
    if (!source || !target) {
        return getEditAircraft(c, "Select a different aircraft to merge into.");
    }
    await app.db.batch([
        app.db
            .update(jumps)
            .set({ aircraftUuid: target.uuid })
            .where(eq(jumps.aircraftUuid, source.uuid)),
        app.db
            .update(aircrafts)
            .set({
                previousJumpCount:
                    target.previousJumpCount + source.previousJumpCount,
            })
            .where(eq(aircrafts.uuid, target.uuid)),
        app.db.delete(aircrafts).where(eq(aircrafts.uuid, source.uuid)),
    ]);
    return c.redirect(routes.logbook.aircraft.edit({ uuid: target.uuid }));
}
