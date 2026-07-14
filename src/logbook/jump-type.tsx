import { and, eq, ne } from "drizzle-orm";
import { getAppContext, app, type AppRequestContext } from "@/app";
import {
    Button,
    ButtonLink,
    FormActions,
    Input,
    NumberInput,
    Textarea,
} from "@/components/form";
import { ErrorList } from "@/components/feedback";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { DangerZone } from "@/components/ui/danger-zone";
import { MergeIntoForm } from "@/components/ui/merge-into-form";
import * as routes from "@/routes";
import { jumpTypes, jumpsToJumpTypes } from "@/schema";
import {
    getRecentJumpsForItem,
    RecentJumpsSection,
    type JumpListItem,
} from "@/logbook/jump-list";
import { LogbookPage } from "@/logbook/layout";
import { getFormString, ResourceSchema } from "@/logbook/resource";

interface JumpTypeFormValues {
    name?: string;
    previousCount?: string;
    description?: string;
}

function JumpTypeForm(props: {
    values?: JumpTypeFormValues;
    errors?: string[];
    submitLabel: string;
}) {
    const values = props.values ?? {};

    return (
        <form
            method="post"
            className="max-w-xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
            <ErrorList
                errors={props.errors ?? []}
                className="border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
            />
            <Input
                name="name"
                label="Name"
                required
                autofocus
                value={values.name}
            />
            <NumberInput
                name="previousCount"
                label="Previous usage count"
                min="0"
                required
                value={values.previousCount ?? "0"}
            />
            <Textarea
                name="description"
                label="Description"
                value={values.description}
            />
            <FormActions
                submitLabel={props.submitLabel}
                cancelHref={routes.jumpTypeList({})}
            />
        </form>
    );
}

function JumpTypeFormPage(props: {
    title: string;
    submitLabel: string;
    values?: JumpTypeFormValues;
    errors?: string[];
    canDelete?: boolean;
    dangerError?: string;
    mergeOptions?: { uuid: string; name: string }[];
    recentJumps?: JumpListItem[];
}) {
    return (
        <LogbookPage title={props.title}>
            <a
                href={routes.jumpTypeList({})}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
                ← Back to jump types
            </a>
            <JumpTypeForm
                values={props.values}
                errors={props.errors}
                submitLabel={props.submitLabel}
            />
            {props.canDelete && (
                <DangerZone>
                    {props.dangerError && (
                        <ErrorList
                            errors={[props.dangerError]}
                            className="mb-3 border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                        />
                    )}
                    {props.mergeOptions && (
                        <MergeIntoForm
                            options={props.mergeOptions}
                            description="Reassign all jumps using this jump type to another jump type, add previous usage counts together, and delete this jump type."
                            selectLabel="Merge into"
                            buttonLabel="Merge jump type"
                        />
                    )}
                    <ConfirmDeleteButton label="Delete jump type" />
                </DangerZone>
            )}
            {props.recentJumps !== undefined && (
                <RecentJumpsSection
                    title="Recent jumps of this type"
                    jumps={props.recentJumps}
                    emptyMessage="No jumps use this jump type yet."
                />
            )}
        </LogbookPage>
    );
}

function getJumpTypeFormValues(formData: FormData): JumpTypeFormValues {
    function getValue(name: string): string {
        const value = formData.get(name);
        return typeof value === "string" ? value : "";
    }

    return {
        name: getValue("name"),
        previousCount: getValue("previousCount"),
        description: getValue("description"),
    };
}

async function handleNewJumpType(c: AppRequestContext) {
    const formData = await c.req.formData();
    const values = getJumpTypeFormValues(formData);
    const result = ResourceSchema.safeParse(values);
    if (!result.success) {
        return c.render(
            <JumpTypeFormPage
                title="Add jump type"
                submitLabel="Add jump type"
                values={values}
                errors={result.error.issues.map((issue) => issue.message)}
            />,
        );
    }
    await getAppContext(c)
        .db.insert(jumpTypes)
        .values({
            userUuid: getAppContext(c).getUser().uuid,
            name: result.data.name,
            previousUsageCount: result.data.previousCount,
            description: result.data.description || null,
        });
    return c.redirect(routes.jumpTypeList({}));
}

async function renderJumpTypeList(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const rows = await db
        .select()
        .from(jumpTypes)
        .where(eq(jumpTypes.userUuid, userUuid))
        .orderBy(jumpTypes.name);

    return c.render(
        <LogbookPage title="Jump types">
            <div className="flex flex-wrap items-center gap-3">
                <ButtonLink
                    href={routes.jumpTypeNew({})}
                    variant="primary"
                    className="gap-1.5"
                >
                    <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2.5"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M12 4v16m8-8H4"
                        />
                    </svg>
                    Add jump type
                </ButtonLink>
            </div>
            {rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        No jump types yet.
                    </p>
                </div>
            ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {rows.map((item) => (
                        <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-black/30">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                                        {item.name}
                                        {item.archived && (
                                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                Archived
                                            </span>
                                        )}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        Previous uses: {item.previousUsageCount}
                                    </p>
                                    {item.description && (
                                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                            {item.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                                <ButtonLink
                                    href={routes.jumpTypeEdit({
                                        uuid: item.uuid,
                                    })}
                                    variant="secondary"
                                    size="sm"
                                >
                                    Edit
                                </ButtonLink>
                                <form
                                    method="post"
                                    action={routes.jumpTypeEdit({
                                        uuid: item.uuid,
                                    })}
                                >
                                    <input
                                        type="hidden"
                                        name="action"
                                        value="toggleArchive"
                                    />
                                    <input
                                        type="hidden"
                                        name="archived"
                                        value={String(!item.archived)}
                                    />
                                    <Button
                                        type="submit"
                                        variant="secondary"
                                        size="sm"
                                    >
                                        {item.archived
                                            ? "Unarchive"
                                            : "Archive"}
                                    </Button>
                                </form>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </LogbookPage>,
    );
}

async function renderEditJumpType(c: AppRequestContext, dangerError?: string) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const { uuid } = routes.jumpTypeEdit.params(c);
    if (!uuid) {
        return c.notFound();
    }
    const item = await db
        .select()
        .from(jumpTypes)
        .where(and(eq(jumpTypes.uuid, uuid), eq(jumpTypes.userUuid, userUuid)))
        .get();
    if (!item) {
        return c.notFound();
    }
    const mergeOptions = await db
        .select({ uuid: jumpTypes.uuid, name: jumpTypes.name })
        .from(jumpTypes)
        .where(
            and(
                eq(jumpTypes.userUuid, userUuid),
                ne(jumpTypes.uuid, item.uuid),
            ),
        )
        .orderBy(jumpTypes.name);
    const recentJumps = await getRecentJumpsForItem(
        c,
        userUuid,
        getAppContext(c).getUser().options,
        item.uuid,
        "jumpType",
    );
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
        />,
    );
}

async function mergeJumpType(
    c: AppRequestContext,
    sourceUuid: string,
    targetUuid: string,
) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    if (!targetUuid || targetUuid === sourceUuid) {
        return renderEditJumpType(
            c,
            "Select a different jump type to merge into.",
        );
    }
    const source = await db
        .select()
        .from(jumpTypes)
        .where(
            and(
                eq(jumpTypes.uuid, sourceUuid),
                eq(jumpTypes.userUuid, userUuid),
            ),
        )
        .get();
    const target = await db
        .select()
        .from(jumpTypes)
        .where(
            and(
                eq(jumpTypes.uuid, targetUuid),
                eq(jumpTypes.userUuid, userUuid),
            ),
        )
        .get();
    if (!source || !target) {
        return renderEditJumpType(
            c,
            "Select a different jump type to merge into.",
        );
    }
    const sourceRows = await db
        .select({ jumpUuid: jumpsToJumpTypes.jumpUuid })
        .from(jumpsToJumpTypes)
        .where(eq(jumpsToJumpTypes.jumpTypeUuid, source.uuid));
    const targetJumpUuids = new Set(
        (
            await db
                .select({ jumpUuid: jumpsToJumpTypes.jumpUuid })
                .from(jumpsToJumpTypes)
                .where(eq(jumpsToJumpTypes.jumpTypeUuid, target.uuid))
        ).map((row) => row.jumpUuid),
    );
    const inserts = sourceRows
        .filter((row) => !targetJumpUuids.has(row.jumpUuid))
        .map((row) =>
            db.insert(jumpsToJumpTypes).values({
                jumpUuid: row.jumpUuid,
                jumpTypeUuid: target.uuid,
            }),
        );
    await db.batch([
        db
            .update(jumpTypes)
            .set({
                previousUsageCount:
                    target.previousUsageCount + source.previousUsageCount,
            })
            .where(eq(jumpTypes.uuid, target.uuid)),
        ...inserts,
        db
            .delete(jumpsToJumpTypes)
            .where(eq(jumpsToJumpTypes.jumpTypeUuid, source.uuid)),
        db.delete(jumpTypes).where(eq(jumpTypes.uuid, source.uuid)),
    ]);
    return c.redirect(routes.jumpTypeEdit({ uuid: target.uuid }));
}

async function handleEditJumpType(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const { uuid } = routes.jumpTypeEdit.params(c);
    if (!uuid) {
        return c.notFound();
    }
    const formData = await c.req.formData();
    if (formData.get("action") === "delete") {
        const usedByJump = await db
            .select({ jumpUuid: jumpsToJumpTypes.jumpUuid })
            .from(jumpsToJumpTypes)
            .where(eq(jumpsToJumpTypes.jumpTypeUuid, uuid))
            .limit(1)
            .get();
        if (usedByJump) {
            return renderEditJumpType(
                c,
                "Cannot delete a jump type that is used by jumps. Archive it instead.",
            );
        }
        const deleted = await db
            .delete(jumpTypes)
            .where(
                and(eq(jumpTypes.uuid, uuid), eq(jumpTypes.userUuid, userUuid)),
            )
            .returning({ uuid: jumpTypes.uuid })
            .get();
        return deleted ? c.redirect(routes.jumpTypeList({})) : c.notFound();
    }
    if (formData.get("action") === "merge") {
        return mergeJumpType(c, uuid, getFormString(formData, "targetUuid"));
    }
    if (formData.get("action") === "toggleArchive") {
        const update = await db
            .update(jumpTypes)
            .set({ archived: formData.get("archived") === "true" })
            .where(
                and(eq(jumpTypes.uuid, uuid), eq(jumpTypes.userUuid, userUuid)),
            )
            .returning({ uuid: jumpTypes.uuid })
            .get();
        return update ? c.redirect(routes.jumpTypeList({})) : c.notFound();
    }
    const values = getJumpTypeFormValues(formData);
    const result = ResourceSchema.safeParse(values);
    const formProps = {
        title: "Edit jump type",
        submitLabel: "Save jump type",
        values,
    };
    if (!result.success) {
        const recentJumps = await getRecentJumpsForItem(
            c,
            userUuid,
            getAppContext(c).getUser().options,
            uuid,
            "jumpType",
        );
        return c.render(
            <JumpTypeFormPage
                {...formProps}
                recentJumps={recentJumps}
                errors={result.error.issues.map((issue) => issue.message)}
            />,
        );
    }
    const update = await db
        .update(jumpTypes)
        .set({
            name: result.data.name,
            previousUsageCount: result.data.previousCount,
            description: result.data.description || null,
        })
        .where(and(eq(jumpTypes.uuid, uuid), eq(jumpTypes.userUuid, userUuid)))
        .returning({ uuid: jumpTypes.uuid })
        .get();
    if (!update) {
        return c.notFound();
    }
    return c.redirect(routes.jumpTypeList({}));
}

app.get(routes.jumpTypeList.route, renderJumpTypeList);
app.get(routes.jumpTypeNew.route, (c) =>
    c.render(
        <JumpTypeFormPage title="Add jump type" submitLabel="Add jump type" />,
    ),
);
app.post(routes.jumpTypeNew.route, handleNewJumpType);
app.get(routes.jumpTypeEdit.route, (c) => renderEditJumpType(c));
app.post(routes.jumpTypeEdit.route, handleEditJumpType);
