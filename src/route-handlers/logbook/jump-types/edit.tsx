import { and, eq, ne, sql } from "drizzle-orm";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import {
    JumpTypeFormPage,
    type JumpTypeFormValues,
} from "@/route-handlers/logbook/jump-types/form";
import { getRecentJumpsForItem } from "@/route-handlers/logbook/components/jump-list";
import { ResourceSchema } from "@/route-handlers/logbook/components/resource";
import { getFormString } from "@/utils";
import * as routes from "@/routes";
import { jumpTypes, jumpsToJumpTypes } from "@/schema";

export function register(app: App) {
    app.get(routes.logbook.jumpTypes.edit.route, (c) => getEditJumpType(c));
    app.post(routes.logbook.jumpTypes.edit.route, updateJumpType);
}

async function getEditJumpType(c: AppRequestContext, dangerError?: string) {
    const app = getAppContext(c);
    const { uuid } = routes.logbook.jumpTypes.edit.params(c);
    if (!uuid) return c.notFound();
    const item = await app.db
        .select()
        .from(jumpTypes)
        .where(
            and(
                eq(jumpTypes.uuid, uuid),
                eq(jumpTypes.userUuid, app.getUser().uuid),
            ),
        )
        .get();
    if (!item) return c.notFound();
    const mergeOptions = await app.db
        .select({ uuid: jumpTypes.uuid, name: jumpTypes.name })
        .from(jumpTypes)
        .where(
            and(
                eq(jumpTypes.userUuid, app.getUser().uuid),
                ne(jumpTypes.uuid, item.uuid),
            ),
        )
        .orderBy(jumpTypes.name);
    const [recentJumps, recordedUsageCount] = await Promise.all([
        getRecentJumpsForItem({
            c,
            userUuid: app.getUser().uuid,
            itemUuid: item.uuid,
            relation: "jumpType",
        }),
        getJumpTypeRecordedUsageCount(c, item.uuid),
    ]);
    return c.render(
        <JumpTypeFormPage
            title="Edit jump type"
            submitLabel="Save jump type"
            values={{
                name: item.name,
                previousCount: String(item.previousUsageCount),
                description: item.description ?? undefined,
            }}
            canDelete
            dangerError={dangerError}
            mergeOptions={mergeOptions}
            recentJumps={recentJumps}
            recordedUsageCount={recordedUsageCount}
        />,
    );
}

async function updateJumpType(c: AppRequestContext) {
    const app = getAppContext(c);
    const { uuid } = routes.logbook.jumpTypes.edit.params(c);
    if (!uuid) return c.notFound();
    const formData = await c.req.formData();
    if (formData.get("action") === "delete") {
        const used = await app.db
            .select({ jumpUuid: jumpsToJumpTypes.jumpUuid })
            .from(jumpsToJumpTypes)
            .where(eq(jumpsToJumpTypes.jumpTypeUuid, uuid))
            .limit(1)
            .get();
        if (used)
            return getEditJumpType(
                c,
                "Cannot delete a jump type that is used by jumps. Archive it instead.",
            );
        const deleted = await app.db
            .delete(jumpTypes)
            .where(
                and(
                    eq(jumpTypes.uuid, uuid),
                    eq(jumpTypes.userUuid, app.getUser().uuid),
                ),
            )
            .returning({ uuid: jumpTypes.uuid })
            .get();
        return deleted
            ? c.redirect(routes.logbook.jumpTypes.index({}))
            : c.notFound();
    }
    if (formData.get("action") === "merge")
        return mergeJumpType(c, uuid, getFormString(formData, "targetUuid"));
    if (formData.get("action") === "toggleArchive") {
        const update = await app.db
            .update(jumpTypes)
            .set({ archived: formData.get("archived") === "true" })
            .where(
                and(
                    eq(jumpTypes.uuid, uuid),
                    eq(jumpTypes.userUuid, app.getUser().uuid),
                ),
            )
            .returning({ uuid: jumpTypes.uuid })
            .get();
        return update
            ? c.redirect(routes.logbook.jumpTypes.index({}))
            : c.notFound();
    }
    const values = getJumpTypeFormValues(formData);
    const result = ResourceSchema.safeParse(values);
    if (!result.success) {
        const [recentJumps, recordedUsageCount] = await Promise.all([
            getRecentJumpsForItem({
                c,
                userUuid: app.getUser().uuid,
                itemUuid: uuid,
                relation: "jumpType",
            }),
            getJumpTypeRecordedUsageCount(c, uuid),
        ]);
        return c.render(
            <JumpTypeFormPage
                title="Edit jump type"
                submitLabel="Save jump type"
                values={values}
                errors={result.error.issues.map((issue) => issue.message)}
                recentJumps={recentJumps}
                recordedUsageCount={recordedUsageCount}
            />,
        );
    }
    const update = await app.db
        .update(jumpTypes)
        .set({
            name: result.data.name,
            previousUsageCount: result.data.previousCount,
            description: result.data.description || null,
        })
        .where(
            and(
                eq(jumpTypes.uuid, uuid),
                eq(jumpTypes.userUuid, app.getUser().uuid),
            ),
        )
        .returning({ uuid: jumpTypes.uuid })
        .get();
    return update
        ? c.redirect(routes.logbook.jumpTypes.index({}))
        : c.notFound();
}

async function mergeJumpType(
    c: AppRequestContext,
    sourceUuid: string,
    targetUuid: string,
) {
    const app = getAppContext(c);
    if (!targetUuid || targetUuid === sourceUuid)
        return getEditJumpType(
            c,
            "Select a different jump type to merge into.",
        );
    const source = await app.db
        .select()
        .from(jumpTypes)
        .where(
            and(
                eq(jumpTypes.uuid, sourceUuid),
                eq(jumpTypes.userUuid, app.getUser().uuid),
            ),
        )
        .get();
    const target = await app.db
        .select()
        .from(jumpTypes)
        .where(
            and(
                eq(jumpTypes.uuid, targetUuid),
                eq(jumpTypes.userUuid, app.getUser().uuid),
            ),
        )
        .get();
    if (!source || !target)
        return getEditJumpType(
            c,
            "Select a different jump type to merge into.",
        );
    const sourceRows = await app.db
        .select({ jumpUuid: jumpsToJumpTypes.jumpUuid })
        .from(jumpsToJumpTypes)
        .where(eq(jumpsToJumpTypes.jumpTypeUuid, source.uuid));
    const targetJumps = new Set(
        (
            await app.db
                .select({ jumpUuid: jumpsToJumpTypes.jumpUuid })
                .from(jumpsToJumpTypes)
                .where(eq(jumpsToJumpTypes.jumpTypeUuid, target.uuid))
        ).map((row) => row.jumpUuid),
    );
    await app.db.batch([
        app.db
            .update(jumpTypes)
            .set({
                previousUsageCount:
                    target.previousUsageCount + source.previousUsageCount,
            })
            .where(eq(jumpTypes.uuid, target.uuid)),
        ...sourceRows
            .filter((row) => !targetJumps.has(row.jumpUuid))
            .map((row) =>
                app.db.insert(jumpsToJumpTypes).values({
                    jumpUuid: row.jumpUuid,
                    jumpTypeUuid: target.uuid,
                }),
            ),
        app.db
            .delete(jumpsToJumpTypes)
            .where(eq(jumpsToJumpTypes.jumpTypeUuid, source.uuid)),
        app.db.delete(jumpTypes).where(eq(jumpTypes.uuid, source.uuid)),
    ]);
    return c.redirect(routes.logbook.jumpTypes.edit({ uuid: target.uuid }));
}

function getJumpTypeFormValues(formData: FormData): JumpTypeFormValues {
    return {
        name: getFormString(formData, "name"),
        previousCount: getFormString(formData, "previousCount"),
        description: getFormString(formData, "description"),
    };
}

async function getJumpTypeRecordedUsageCount(
    c: AppRequestContext,
    jumpTypeUuid: string,
): Promise<number> {
    const row = await getAppContext(c)
        .db.select({ count: sql<number>`count(*)` })
        .from(jumpsToJumpTypes)
        .where(eq(jumpsToJumpTypes.jumpTypeUuid, jumpTypeUuid))
        .get();
    return row?.count ?? 0;
}
