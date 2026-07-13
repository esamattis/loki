import { and, eq } from "drizzle-orm";
import { getAppContext, app, type AppRequestContext } from "../app";
import { FormActions, Input, NumberInput, Textarea } from "../components/form";
import { ErrorList } from "../components/feedback";
import { ConfirmDeleteButton, DangerZone } from "../components/ui";
import * as routes from "../routes";
import { jumpTypes } from "../schema";
import {
    getRecentJumpsForItem,
    RecentJumpsSection,
    type JumpListItem,
} from "./jump-list";
import { LogbookPage } from "./layout";
import { ResourceSchema } from "./resource";

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
                defaultValue={values.description}
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
    recentJumps?: JumpListItem[];
}) {
    return (
        <LogbookPage title={props.title}>
            <JumpTypeForm
                values={props.values}
                errors={props.errors}
                submitLabel={props.submitLabel}
            />
            {props.canDelete && (
                <DangerZone>
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
                <a
                    href={routes.jumpTypeNew({})}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus:ring-indigo-400/40"
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
                </a>
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
                                <a
                                    href={routes.jumpTypeEdit({
                                        uuid: item.uuid,
                                    })}
                                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-indigo-400/40"
                                >
                                    Edit
                                </a>
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
                                    <button
                                        type="submit"
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-indigo-400/40"
                                    >
                                        {item.archived
                                            ? "Unarchive"
                                            : "Archive"}
                                    </button>
                                </form>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </LogbookPage>,
    );
}

async function renderEditJumpType(c: AppRequestContext) {
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
            recentJumps={recentJumps}
        />,
    );
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
        const deleted = await db
            .delete(jumpTypes)
            .where(
                and(eq(jumpTypes.uuid, uuid), eq(jumpTypes.userUuid, userUuid)),
            )
            .returning({ uuid: jumpTypes.uuid })
            .get();
        return deleted ? c.redirect(routes.jumpTypeList({})) : c.notFound();
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
app.get(routes.jumpTypeEdit.route, renderEditJumpType);
app.post(routes.jumpTypeEdit.route, handleEditJumpType);
