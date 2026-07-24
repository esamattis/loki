import { and, eq, ne, sql } from "drizzle-orm";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import {
    LocationFormPage,
    type LocationFormValues,
} from "@/route-handlers/logbook/locations/form";
import { getRecentJumpsForItem } from "@/route-handlers/logbook/components/jump-list";
import { ResourceSchema } from "@/route-handlers/logbook/components/resource";
import { getFormString } from "@/utils";
import * as routes from "@/routes";
import { jumps, locations } from "@/schema";

export function register(app: App) {
    app.get(routes.logbook.locations.edit.route, (c) => getEditLocation(c));
    app.post(routes.logbook.locations.edit.route, updateLocation);
}

async function getEditLocation(c: AppRequestContext, dangerError?: string) {
    const app = getAppContext(c);
    const { uuid } = routes.logbook.locations.edit.params(c);
    if (!uuid) return c.notFound();
    const item = await app.db
        .select()
        .from(locations)
        .where(
            and(
                eq(locations.uuid, uuid),
                eq(locations.userUuid, app.getUser().uuid),
            ),
        )
        .get();
    if (!item) return c.notFound();
    const mergeOptions = await app.db
        .select({ uuid: locations.uuid, name: locations.name })
        .from(locations)
        .where(
            and(
                eq(locations.userUuid, app.getUser().uuid),
                ne(locations.uuid, item.uuid),
            ),
        )
        .orderBy(locations.name);
    const [recentJumps, recordedUsageCount] = await Promise.all([
        getRecentJumpsForItem({
            c,
            userUuid: app.getUser().uuid,
            itemUuid: item.uuid,
            relation: "location",
        }),
        getLocationRecordedUsageCount(c, item.uuid),
    ]);
    return c.render(
        <LocationFormPage
            title="Edit location"
            submitLabel="Save location"
            values={{
                name: item.name,
                previousCount: String(item.previousJumpCount),
                description: item.description ?? undefined,
            }}
            canDelete
            archived={item.archived}
            dangerError={dangerError}
            mergeOptions={mergeOptions}
            recentJumps={recentJumps}
            recordedUsageCount={recordedUsageCount}
        />,
    );
}

async function updateLocation(c: AppRequestContext) {
    const app = getAppContext(c);
    const { uuid } = routes.logbook.locations.edit.params(c);
    if (!uuid) return c.notFound();
    const formData = await c.req.formData();
    if (formData.get("action") === "delete") {
        const used = await app.db
            .select({ uuid: jumps.uuid })
            .from(jumps)
            .where(eq(jumps.locationUuid, uuid))
            .limit(1)
            .get();
        if (used)
            return getEditLocation(
                c,
                "Cannot delete a location that is used by jumps. Archive it instead.",
            );
        const deleted = await app.db
            .delete(locations)
            .where(
                and(
                    eq(locations.uuid, uuid),
                    eq(locations.userUuid, app.getUser().uuid),
                ),
            )
            .returning({ uuid: locations.uuid })
            .get();
        return deleted
            ? c.redirect(routes.logbook.locations.index({}))
            : c.notFound();
    }
    if (formData.get("action") === "merge")
        return mergeLocation(c, uuid, getFormString(formData, "targetUuid"));
    if (formData.get("action") === "toggleArchive") {
        const update = await app.db
            .update(locations)
            .set({ archived: formData.get("archived") === "true" })
            .where(
                and(
                    eq(locations.uuid, uuid),
                    eq(locations.userUuid, app.getUser().uuid),
                ),
            )
            .returning({ uuid: locations.uuid })
            .get();
        return update
            ? c.redirect(routes.logbook.locations.index({}))
            : c.notFound();
    }
    const values = getLocationFormValues(formData);
    const result = ResourceSchema.safeParse(values);
    if (!result.success) {
        const [recentJumps, recordedUsageCount] = await Promise.all([
            getRecentJumpsForItem({
                c,
                userUuid: app.getUser().uuid,
                itemUuid: uuid,
                relation: "location",
            }),
            getLocationRecordedUsageCount(c, uuid),
        ]);
        return c.render(
            <LocationFormPage
                title="Edit location"
                submitLabel="Save location"
                values={values}
                errors={result.error.issues.map((issue) => issue.message)}
                recentJumps={recentJumps}
                recordedUsageCount={recordedUsageCount}
            />,
        );
    }
    const update = await app.db
        .update(locations)
        .set({
            name: result.data.name,
            previousJumpCount: result.data.previousCount,
            description: result.data.description || null,
        })
        .where(
            and(
                eq(locations.uuid, uuid),
                eq(locations.userUuid, app.getUser().uuid),
            ),
        )
        .returning({ uuid: locations.uuid })
        .get();
    return update
        ? c.redirect(routes.logbook.locations.index({}))
        : c.notFound();
}

async function mergeLocation(
    c: AppRequestContext,
    sourceUuid: string,
    targetUuid: string,
) {
    const app = getAppContext(c);
    if (!targetUuid || targetUuid === sourceUuid)
        return getEditLocation(c, "Select a different location to merge into.");
    const source = await app.db
        .select()
        .from(locations)
        .where(
            and(
                eq(locations.uuid, sourceUuid),
                eq(locations.userUuid, app.getUser().uuid),
            ),
        )
        .get();
    const target = await app.db
        .select()
        .from(locations)
        .where(
            and(
                eq(locations.uuid, targetUuid),
                eq(locations.userUuid, app.getUser().uuid),
            ),
        )
        .get();
    if (!source || !target)
        return getEditLocation(c, "Select a different location to merge into.");
    await app.db.batch([
        app.db
            .update(jumps)
            .set({ locationUuid: target.uuid })
            .where(eq(jumps.locationUuid, source.uuid)),
        app.db
            .update(locations)
            .set({
                previousJumpCount:
                    target.previousJumpCount + source.previousJumpCount,
            })
            .where(eq(locations.uuid, target.uuid)),
        app.db.delete(locations).where(eq(locations.uuid, source.uuid)),
    ]);
    return c.redirect(routes.logbook.locations.edit({ uuid: target.uuid }));
}

function getLocationFormValues(formData: FormData): LocationFormValues {
    return {
        name: getFormString(formData, "name"),
        previousCount: getFormString(formData, "previousCount"),
        description: getFormString(formData, "description"),
    };
}

async function getLocationRecordedUsageCount(
    c: AppRequestContext,
    locationUuid: string,
): Promise<number> {
    const row = await getAppContext(c)
        .db.select({ count: sql<number>`count(*)` })
        .from(jumps)
        .where(eq(jumps.locationUuid, locationUuid))
        .get();
    return row?.count ?? 0;
}
