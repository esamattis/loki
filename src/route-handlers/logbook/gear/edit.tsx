import { and, eq, ne, sql } from "drizzle-orm";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import {
    GearFormPage,
    type GearFormValues,
} from "@/route-handlers/logbook/gear/form";
import { getRecentJumpsForItem } from "@/route-handlers/logbook/components/jump-list";
import { ResourceSchema } from "@/route-handlers/logbook/components/resource";
import { getFormString } from "@/utils";
import * as routes from "@/routes";
import { gear, jumpsToGear, jumpsToJumpTypes, jumpTypes } from "@/schema";

export function register(app: App) {
    app.get(routes.logbook.gear.edit.route, (c) => getEditGear(c));
    app.post(routes.logbook.gear.edit.route, updateGear);
}

async function getEditGear(c: AppRequestContext, dangerError?: string) {
    const app = getAppContext(c);
    const { uuid } = routes.logbook.gear.edit.params(c);
    if (!uuid) return c.notFound();
    const item = await app.db
        .select()
        .from(gear)
        .where(and(eq(gear.uuid, uuid), eq(gear.userUuid, app.getUser().uuid)))
        .get();
    if (!item) return c.notFound();
    const mergeOptions = await app.db
        .select({ uuid: gear.uuid, name: gear.name })
        .from(gear)
        .where(
            and(
                eq(gear.userUuid, app.getUser().uuid),
                ne(gear.uuid, item.uuid),
            ),
        )
        .orderBy(gear.name);
    const [recentJumps, recordedUsageCount] = await Promise.all([
        getRecentJumpsForItem({
            c,
            userUuid: app.getUser().uuid,
            itemUuid: item.uuid,
            relation: "gear",
        }),
        getGearRecordedUsageCount(c, item.uuid),
    ]);
    return c.render(
        <GearFormPage
            title="Edit gear"
            submitLabel="Save gear"
            values={{
                name: item.name,
                previousCount: String(item.previousUsageCount),
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

async function updateGear(c: AppRequestContext) {
    const app = getAppContext(c);
    const { uuid } = routes.logbook.gear.edit.params(c);
    if (!uuid) return c.notFound();
    const formData = await c.req.formData();
    if (formData.get("action") === "delete") {
        const used = await app.db
            .select({ jumpUuid: jumpsToGear.jumpUuid })
            .from(jumpsToGear)
            .where(eq(jumpsToGear.gearUuid, uuid))
            .limit(1)
            .get();
        if (used)
            return getEditGear(
                c,
                "Cannot delete gear that is used by jumps. Archive it instead.",
            );
        const deleted = await app.db
            .delete(gear)
            .where(
                and(eq(gear.uuid, uuid), eq(gear.userUuid, app.getUser().uuid)),
            )
            .returning({ uuid: gear.uuid })
            .get();
        return deleted
            ? c.redirect(routes.logbook.gear.index({}))
            : c.notFound();
    }
    if (formData.get("action") === "merge")
        return mergeGear(c, uuid, getFormString(formData, "targetUuid"));
    if (formData.get("action") === "toggleArchive") {
        const update = await app.db
            .update(gear)
            .set({ archived: formData.get("archived") === "true" })
            .where(
                and(eq(gear.uuid, uuid), eq(gear.userUuid, app.getUser().uuid)),
            )
            .returning({ uuid: gear.uuid })
            .get();
        return update
            ? c.redirect(routes.logbook.gear.index({}))
            : c.notFound();
    }
    if (formData.get("action") === "convertToJumpType") {
        const item = await app.db
            .select()
            .from(gear)
            .where(
                and(eq(gear.uuid, uuid), eq(gear.userUuid, app.getUser().uuid)),
            )
            .get();
        if (!item) return c.notFound();
        const jumpRows = await app.db
            .select({ jumpUuid: jumpsToGear.jumpUuid })
            .from(jumpsToGear)
            .where(eq(jumpsToGear.gearUuid, item.uuid));
        const jumpTypeUuid = crypto.randomUUID();
        await app.db.batch([
            app.db.insert(jumpTypes).values({
                uuid: jumpTypeUuid,
                userUuid: item.userUuid,
                name: item.name,
                previousUsageCount: item.previousUsageCount,
                description: item.description,
                archived: item.archived,
            }),
            ...jumpRows.map((row) =>
                app.db
                    .insert(jumpsToJumpTypes)
                    .values({ jumpUuid: row.jumpUuid, jumpTypeUuid }),
            ),
            app.db.delete(gear).where(eq(gear.uuid, item.uuid)),
        ]);
        return c.redirect(
            routes.logbook.jumpTypes.edit({ uuid: jumpTypeUuid }),
        );
    }
    const values = getGearFormValues(formData);
    const result = ResourceSchema.safeParse(values);
    if (!result.success) {
        const [recentJumps, recordedUsageCount] = await Promise.all([
            getRecentJumpsForItem({
                c,
                userUuid: app.getUser().uuid,
                itemUuid: uuid,
                relation: "gear",
            }),
            getGearRecordedUsageCount(c, uuid),
        ]);
        return c.render(
            <GearFormPage
                title="Edit gear"
                submitLabel="Save gear"
                values={values}
                errors={result.error.issues.map((issue) => issue.message)}
                recentJumps={recentJumps}
                recordedUsageCount={recordedUsageCount}
            />,
        );
    }
    const update = await app.db
        .update(gear)
        .set({
            name: result.data.name,
            previousUsageCount: result.data.previousCount,
            description: result.data.description || null,
        })
        .where(and(eq(gear.uuid, uuid), eq(gear.userUuid, app.getUser().uuid)))
        .returning({ uuid: gear.uuid })
        .get();
    return update ? c.redirect(routes.logbook.gear.index({})) : c.notFound();
}

async function mergeGear(
    c: AppRequestContext,
    sourceUuid: string,
    targetUuid: string,
) {
    const app = getAppContext(c);
    if (!targetUuid || targetUuid === sourceUuid)
        return getEditGear(c, "Select a different gear to merge into.");
    const source = await app.db
        .select()
        .from(gear)
        .where(
            and(
                eq(gear.uuid, sourceUuid),
                eq(gear.userUuid, app.getUser().uuid),
            ),
        )
        .get();
    const target = await app.db
        .select()
        .from(gear)
        .where(
            and(
                eq(gear.uuid, targetUuid),
                eq(gear.userUuid, app.getUser().uuid),
            ),
        )
        .get();
    if (!source || !target)
        return getEditGear(c, "Select a different gear to merge into.");
    const sourceRows = await app.db
        .select({ jumpUuid: jumpsToGear.jumpUuid })
        .from(jumpsToGear)
        .where(eq(jumpsToGear.gearUuid, source.uuid));
    const targetJumps = new Set(
        (
            await app.db
                .select({ jumpUuid: jumpsToGear.jumpUuid })
                .from(jumpsToGear)
                .where(eq(jumpsToGear.gearUuid, target.uuid))
        ).map((row) => row.jumpUuid),
    );
    await app.db.batch([
        app.db
            .update(gear)
            .set({
                previousUsageCount:
                    target.previousUsageCount + source.previousUsageCount,
            })
            .where(eq(gear.uuid, target.uuid)),
        ...sourceRows
            .filter((row) => !targetJumps.has(row.jumpUuid))
            .map((row) =>
                app.db
                    .insert(jumpsToGear)
                    .values({ jumpUuid: row.jumpUuid, gearUuid: target.uuid }),
            ),
        app.db.delete(jumpsToGear).where(eq(jumpsToGear.gearUuid, source.uuid)),
        app.db.delete(gear).where(eq(gear.uuid, source.uuid)),
    ]);
    return c.redirect(routes.logbook.gear.edit({ uuid: target.uuid }));
}

function getGearFormValues(formData: FormData): GearFormValues {
    return {
        name: getFormString(formData, "name"),
        previousCount: getFormString(formData, "previousCount"),
        description: getFormString(formData, "description"),
    };
}

async function getGearRecordedUsageCount(
    c: AppRequestContext,
    gearUuid: string,
): Promise<number> {
    const row = await getAppContext(c)
        .db.select({ count: sql<number>`count(*)` })
        .from(jumpsToGear)
        .where(eq(jumpsToGear.gearUuid, gearUuid))
        .get();
    return row?.count ?? 0;
}
