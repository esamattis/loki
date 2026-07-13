import { and, eq } from "drizzle-orm";
import { getAppContext, app, type AppRequestContext } from "../app";
import { FormActions, Input, NumberInput, Textarea } from "../components/form";
import { ErrorList } from "../components/feedback";
import { ConfirmDeleteButton, DangerZone } from "../components/ui";
import * as routes from "../routes";
import { gear, jumpsToGear, jumpsToJumpTypes, jumpTypes } from "../schema";
import {
    getRecentJumpsForItem,
    RecentJumpsSection,
    type JumpListItem,
} from "./jump-list";
import { LogbookPage } from "./layout";
import { ResourceSchema } from "./resource";

interface GearFormValues {
    name?: string;
    previousCount?: string;
    description?: string;
}

function GearForm(props: {
    values?: GearFormValues;
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
                cancelHref={routes.gearList({})}
            />
        </form>
    );
}

function GearFormPage(props: {
    title: string;
    submitLabel: string;
    values?: GearFormValues;
    errors?: string[];
    canDelete?: boolean;
    deleteError?: string;
    recentJumps?: JumpListItem[];
}) {
    return (
        <LogbookPage title={props.title}>
            <GearForm
                values={props.values}
                errors={props.errors}
                submitLabel={props.submitLabel}
            />
            {props.canDelete && (
                <DangerZone>
                    {props.deleteError && (
                        <ErrorList
                            errors={[props.deleteError]}
                            className="mb-3 border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                        />
                    )}
                    <ConfirmDeleteButton label="Delete gear" />
                </DangerZone>
            )}
            {props.recentJumps !== undefined && (
                <RecentJumpsSection
                    title="Recent jumps with this gear"
                    jumps={props.recentJumps}
                    emptyMessage="No jumps use this gear yet."
                />
            )}
        </LogbookPage>
    );
}

function getGearFormValues(formData: FormData): GearFormValues {
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

async function handleNewGear(c: AppRequestContext) {
    const formData = await c.req.formData();
    const values = getGearFormValues(formData);
    const result = ResourceSchema.safeParse(values);
    if (!result.success) {
        return c.render(
            <GearFormPage
                title="Add gear"
                submitLabel="Add gear"
                values={values}
                errors={result.error.issues.map((issue) => issue.message)}
            />,
        );
    }
    await getAppContext(c)
        .db.insert(gear)
        .values({
            userUuid: getAppContext(c).getUser().uuid,
            name: result.data.name,
            previousUsageCount: result.data.previousCount,
            description: result.data.description || null,
        });
    return c.redirect(routes.gearList({}));
}

async function renderGearList(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const rows = await db
        .select()
        .from(gear)
        .where(eq(gear.userUuid, userUuid))
        .orderBy(gear.name);

    return c.render(
        <LogbookPage title="Gear">
            <div className="flex flex-wrap items-center gap-3">
                <a
                    href={routes.gearNew({})}
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
                    Add gear
                </a>
            </div>
            {rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        No gear yet.
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
                                    href={routes.gearEdit({ uuid: item.uuid })}
                                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-indigo-400/40"
                                >
                                    Edit
                                </a>
                                <form
                                    method="post"
                                    action={routes.gearEdit({
                                        uuid: item.uuid,
                                    })}
                                >
                                    <input
                                        type="hidden"
                                        name="action"
                                        value="convertToJumpType"
                                    />
                                    <button
                                        type="submit"
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-indigo-400/40"
                                    >
                                        Convert to jump type
                                    </button>
                                </form>
                                <form
                                    method="post"
                                    action={routes.gearEdit({
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

async function renderEditGear(c: AppRequestContext, deleteError?: string) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const { uuid } = routes.gearEdit.params(c);
    if (!uuid) {
        return c.notFound();
    }
    const item = await db
        .select()
        .from(gear)
        .where(and(eq(gear.uuid, uuid), eq(gear.userUuid, userUuid)))
        .get();
    if (!item) {
        return c.notFound();
    }
    const recentJumps = await getRecentJumpsForItem(
        c,
        userUuid,
        getAppContext(c).getUser().options,
        item.uuid,
        "gear",
    );
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
            deleteError={deleteError}
            recentJumps={recentJumps}
        />,
    );
}

async function handleEditGear(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const { uuid } = routes.gearEdit.params(c);
    if (!uuid) {
        return c.notFound();
    }
    const formData = await c.req.formData();
    if (formData.get("action") === "delete") {
        const usedByJump = await db
            .select({ jumpUuid: jumpsToGear.jumpUuid })
            .from(jumpsToGear)
            .where(eq(jumpsToGear.gearUuid, uuid))
            .limit(1)
            .get();
        if (usedByJump) {
            return renderEditGear(
                c,
                "Cannot delete gear that is used by jumps. Archive it instead.",
            );
        }
        const deleted = await db
            .delete(gear)
            .where(and(eq(gear.uuid, uuid), eq(gear.userUuid, userUuid)))
            .returning({ uuid: gear.uuid })
            .get();
        return deleted ? c.redirect(routes.gearList({})) : c.notFound();
    }
    if (formData.get("action") === "toggleArchive") {
        const update = await db
            .update(gear)
            .set({ archived: formData.get("archived") === "true" })
            .where(and(eq(gear.uuid, uuid), eq(gear.userUuid, userUuid)))
            .returning({ uuid: gear.uuid })
            .get();
        return update ? c.redirect(routes.gearList({})) : c.notFound();
    }
    if (formData.get("action") === "convertToJumpType") {
        const item = await db
            .select()
            .from(gear)
            .where(and(eq(gear.uuid, uuid), eq(gear.userUuid, userUuid)))
            .get();
        if (!item) {
            return c.notFound();
        }
        const jumpRows = await db
            .select({ jumpUuid: jumpsToGear.jumpUuid })
            .from(jumpsToGear)
            .where(eq(jumpsToGear.gearUuid, item.uuid));
        const jumpTypeUuid = crypto.randomUUID();
        await db.batch([
            db.insert(jumpTypes).values({
                uuid: jumpTypeUuid,
                userUuid: item.userUuid,
                name: item.name,
                previousUsageCount: item.previousUsageCount,
                description: item.description,
                archived: item.archived,
            }),
            ...jumpRows.map((row) =>
                db
                    .insert(jumpsToJumpTypes)
                    .values({ jumpUuid: row.jumpUuid, jumpTypeUuid }),
            ),
            db.delete(gear).where(eq(gear.uuid, item.uuid)),
        ]);
        return c.redirect(routes.jumpTypeEdit({ uuid: jumpTypeUuid }));
    }
    const values = getGearFormValues(formData);
    const result = ResourceSchema.safeParse(values);
    const formProps = {
        title: "Edit gear",
        submitLabel: "Save gear",
        values,
    };
    if (!result.success) {
        const recentJumps = await getRecentJumpsForItem(
            c,
            userUuid,
            getAppContext(c).getUser().options,
            uuid,
            "gear",
        );
        return c.render(
            <GearFormPage
                {...formProps}
                recentJumps={recentJumps}
                errors={result.error.issues.map((issue) => issue.message)}
            />,
        );
    }
    const update = await db
        .update(gear)
        .set({
            name: result.data.name,
            previousUsageCount: result.data.previousCount,
            description: result.data.description || null,
        })
        .where(and(eq(gear.uuid, uuid), eq(gear.userUuid, userUuid)))
        .returning({ uuid: gear.uuid })
        .get();
    if (!update) {
        return c.notFound();
    }
    return c.redirect(routes.gearList({}));
}

app.get(routes.gearList.route, renderGearList);
app.get(routes.gearNew.route, (c) =>
    c.render(<GearFormPage title="Add gear" submitLabel="Add gear" />),
);
app.post(routes.gearNew.route, handleNewGear);
app.get(routes.gearEdit.route, (c) => renderEditGear(c));
app.post(routes.gearEdit.route, handleEditGear);
