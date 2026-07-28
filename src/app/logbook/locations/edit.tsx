import { registerRoute } from "@/core/register-route";
import { and, eq, ne, sql } from "drizzle-orm";
import {
    getRequestContext,
    type AppRouter,
    type HonoRequestContext,
} from "@/core/create-app";
import {
    LocationFormPage,
    type LocationFormValues,
} from "@/app/logbook/locations/form";
import { getRecentJumpsForItem } from "@/app/logbook/components/jump-list";
import { ResourceSchema } from "@/app/logbook/components/resource";
import { getFormString } from "@/core/utils";
import * as routes from "@/app/routes";
import { jumps, locations } from "@/app/schema";

export function register(app: AppRouter) {
    registerRoute(app, "get", routes.logbook.locations.edit, (c) =>
        getEditLocation(c),
    );
    registerRoute(app, "post", routes.logbook.locations.edit, updateLocation);
}

async function getEditLocation(c: HonoRequestContext, dangerError?: string) {
    const requestContext = getRequestContext(c);
    const { uuid } = routes.logbook.locations.edit.params(c);
    if (!uuid) return c.notFound();
    const item = await requestContext.db
        .select()
        .from(locations)
        .where(
            and(
                eq(locations.uuid, uuid),
                eq(locations.userUuid, requestContext.getUser().uuid),
            ),
        )
        .get();
    if (!item) return c.notFound();
    const mergeOptions = await requestContext.db
        .select({ uuid: locations.uuid, name: locations.name })
        .from(locations)
        .where(
            and(
                eq(locations.userUuid, requestContext.getUser().uuid),
                ne(locations.uuid, item.uuid),
            ),
        )
        .orderBy(locations.name);
    const [recentJumps, recordedUsageCount] = await Promise.all([
        getRecentJumpsForItem({
            c,
            userUuid: requestContext.getUser().uuid,
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

async function updateLocation(c: HonoRequestContext) {
    const requestContext = getRequestContext(c);
    const { uuid } = routes.logbook.locations.edit.params(c);
    if (!uuid) return c.notFound();
    const formData = await c.req.formData();
    if (formData.get("action") === "delete") {
        const used = await requestContext.db
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
        const deleted = await requestContext.db
            .delete(locations)
            .where(
                and(
                    eq(locations.uuid, uuid),
                    eq(locations.userUuid, requestContext.getUser().uuid),
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
        const update = await requestContext.db
            .update(locations)
            .set({ archived: formData.get("archived") === "true" })
            .where(
                and(
                    eq(locations.uuid, uuid),
                    eq(locations.userUuid, requestContext.getUser().uuid),
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
                userUuid: requestContext.getUser().uuid,
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
    const update = await requestContext.db
        .update(locations)
        .set({
            name: result.data.name,
            previousJumpCount: result.data.previousCount,
            description: result.data.description || null,
        })
        .where(
            and(
                eq(locations.uuid, uuid),
                eq(locations.userUuid, requestContext.getUser().uuid),
            ),
        )
        .returning({ uuid: locations.uuid })
        .get();
    return update
        ? c.redirect(routes.logbook.locations.index({}))
        : c.notFound();
}

async function mergeLocation(
    c: HonoRequestContext,
    sourceUuid: string,
    targetUuid: string,
) {
    const requestContext = getRequestContext(c);
    if (!targetUuid || targetUuid === sourceUuid)
        return getEditLocation(c, "Select a different location to merge into.");
    const source = await requestContext.db
        .select()
        .from(locations)
        .where(
            and(
                eq(locations.uuid, sourceUuid),
                eq(locations.userUuid, requestContext.getUser().uuid),
            ),
        )
        .get();
    const target = await requestContext.db
        .select()
        .from(locations)
        .where(
            and(
                eq(locations.uuid, targetUuid),
                eq(locations.userUuid, requestContext.getUser().uuid),
            ),
        )
        .get();
    if (!source || !target)
        return getEditLocation(c, "Select a different location to merge into.");
    await requestContext.db.batch([
        requestContext.db
            .update(jumps)
            .set({ locationUuid: target.uuid })
            .where(eq(jumps.locationUuid, source.uuid)),
        requestContext.db
            .update(locations)
            .set({
                previousJumpCount:
                    target.previousJumpCount + source.previousJumpCount,
            })
            .where(eq(locations.uuid, target.uuid)),
        requestContext.db
            .delete(locations)
            .where(eq(locations.uuid, source.uuid)),
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
    c: HonoRequestContext,
    locationUuid: string,
): Promise<number> {
    const row = await getRequestContext(c)
        .db.select({ count: sql<number>`count(*)` })
        .from(jumps)
        .where(eq(jumps.locationUuid, locationUuid))
        .get();
    return row?.count ?? 0;
}
