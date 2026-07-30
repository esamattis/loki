import { and, eq, ne, sql } from "drizzle-orm";
import {
    getRequestContext,
    type AppRouter,
    type HonoRequestContext,
} from "@/core/create-app";
import {
    JumpTypeFormPage,
    type JumpTypeFormValues,
} from "@/app/logbook/jump-types/form";
import { getRecentJumpsForItem } from "@/app/logbook/components/jump-list";
import { ResourceSchema } from "@/app/logbook/components/resource";
import { getFormString } from "@/core/utils";
import * as routes from "@/app/routes";
import { jumpTypes, jumpsToJumpTypes } from "@/app/schema";

export function register(app: AppRouter) {
    app.get(routes.logbook.jumpTypes.edit, (c) => getEditJumpType(c));
    app.post(routes.logbook.jumpTypes.edit, updateJumpType);
}

async function getEditJumpType(c: HonoRequestContext, dangerError?: string) {
    const requestContext = getRequestContext(c);
    const { uuid } = routes.logbook.jumpTypes.edit.params(c);
    if (!uuid) return c.notFound();
    const item = await requestContext.db
        .select()
        .from(jumpTypes)
        .where(
            and(
                eq(jumpTypes.uuid, uuid),
                eq(jumpTypes.userUuid, requestContext.getUser().uuid),
            ),
        )
        .get();
    if (!item) return c.notFound();
    const mergeOptions = await requestContext.db
        .select({ uuid: jumpTypes.uuid, name: jumpTypes.name })
        .from(jumpTypes)
        .where(
            and(
                eq(jumpTypes.userUuid, requestContext.getUser().uuid),
                ne(jumpTypes.uuid, item.uuid),
            ),
        )
        .orderBy(jumpTypes.name);
    const [recentJumps, recordedUsageCount] = await Promise.all([
        getRecentJumpsForItem({
            c,
            userUuid: requestContext.getUser().uuid,
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
            archived={item.archived}
            dangerError={dangerError}
            mergeOptions={mergeOptions}
            recentJumps={recentJumps}
            recordedUsageCount={recordedUsageCount}
        />,
    );
}

async function updateJumpType(c: HonoRequestContext) {
    const requestContext = getRequestContext(c);
    const { uuid } = routes.logbook.jumpTypes.edit.params(c);
    if (!uuid) return c.notFound();
    const formData = await c.req.formData();
    if (formData.get("action") === "delete") {
        const used = await requestContext.db
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
        const deleted = await requestContext.db
            .delete(jumpTypes)
            .where(
                and(
                    eq(jumpTypes.uuid, uuid),
                    eq(jumpTypes.userUuid, requestContext.getUser().uuid),
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
        const update = await requestContext.db
            .update(jumpTypes)
            .set({ archived: formData.get("archived") === "true" })
            .where(
                and(
                    eq(jumpTypes.uuid, uuid),
                    eq(jumpTypes.userUuid, requestContext.getUser().uuid),
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
                userUuid: requestContext.getUser().uuid,
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
    const update = await requestContext.db
        .update(jumpTypes)
        .set({
            name: result.data.name,
            previousUsageCount: result.data.previousCount,
            description: result.data.description || null,
        })
        .where(
            and(
                eq(jumpTypes.uuid, uuid),
                eq(jumpTypes.userUuid, requestContext.getUser().uuid),
            ),
        )
        .returning({ uuid: jumpTypes.uuid })
        .get();
    return update
        ? c.redirect(routes.logbook.jumpTypes.index({}))
        : c.notFound();
}

async function mergeJumpType(
    c: HonoRequestContext,
    sourceUuid: string,
    targetUuid: string,
) {
    const requestContext = getRequestContext(c);
    if (!targetUuid || targetUuid === sourceUuid)
        return getEditJumpType(
            c,
            "Select a different jump type to merge into.",
        );
    const source = await requestContext.db
        .select()
        .from(jumpTypes)
        .where(
            and(
                eq(jumpTypes.uuid, sourceUuid),
                eq(jumpTypes.userUuid, requestContext.getUser().uuid),
            ),
        )
        .get();
    const target = await requestContext.db
        .select()
        .from(jumpTypes)
        .where(
            and(
                eq(jumpTypes.uuid, targetUuid),
                eq(jumpTypes.userUuid, requestContext.getUser().uuid),
            ),
        )
        .get();
    if (!source || !target)
        return getEditJumpType(
            c,
            "Select a different jump type to merge into.",
        );
    const sourceRows = await requestContext.db
        .select({ jumpUuid: jumpsToJumpTypes.jumpUuid })
        .from(jumpsToJumpTypes)
        .where(eq(jumpsToJumpTypes.jumpTypeUuid, source.uuid));
    const targetJumps = new Set(
        (
            await requestContext.db
                .select({ jumpUuid: jumpsToJumpTypes.jumpUuid })
                .from(jumpsToJumpTypes)
                .where(eq(jumpsToJumpTypes.jumpTypeUuid, target.uuid))
        ).map((row) => row.jumpUuid),
    );
    await requestContext.db.batch([
        requestContext.db
            .update(jumpTypes)
            .set({
                previousUsageCount:
                    target.previousUsageCount + source.previousUsageCount,
            })
            .where(eq(jumpTypes.uuid, target.uuid)),
        ...sourceRows
            .filter((row) => !targetJumps.has(row.jumpUuid))
            .map((row) =>
                requestContext.db.insert(jumpsToJumpTypes).values({
                    jumpUuid: row.jumpUuid,
                    jumpTypeUuid: target.uuid,
                }),
            ),
        requestContext.db
            .delete(jumpsToJumpTypes)
            .where(eq(jumpsToJumpTypes.jumpTypeUuid, source.uuid)),
        requestContext.db
            .delete(jumpTypes)
            .where(eq(jumpTypes.uuid, source.uuid)),
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
    c: HonoRequestContext,
    jumpTypeUuid: string,
): Promise<number> {
    const row = await getRequestContext(c)
        .db.select({ count: sql<number>`count(*)` })
        .from(jumpsToJumpTypes)
        .where(eq(jumpsToJumpTypes.jumpTypeUuid, jumpTypeUuid))
        .get();
    return row?.count ?? 0;
}
