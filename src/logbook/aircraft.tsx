import { and, eq } from "drizzle-orm";
import { getAppContext, app, type AppRequestContext } from "../app";
import { FormActions, Input, NumberInput, Textarea } from "../components/form";
import { ErrorList } from "../components/feedback";
import { ConfirmDeleteButton, DangerZone } from "../components/ui";
import * as routes from "../routes";
import { aircrafts, jumps } from "../schema";
import { LogbookPage } from "./layout";
import { ResourceSchema } from "./resource";

interface AircraftFormValues {
    name?: string;
    previousCount?: string;
    description?: string;
}

function AircraftForm(props: {
    values?: AircraftFormValues;
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
                label="Previous jump count"
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
                cancelHref={routes.aircraftList({})}
            />
        </form>
    );
}

function AircraftFormPage(props: {
    title: string;
    submitLabel: string;
    values?: AircraftFormValues;
    errors?: string[];
    canDelete?: boolean;
    deleteError?: string;
}) {
    return (
        <LogbookPage title={props.title}>
            <AircraftForm
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
                    <ConfirmDeleteButton label="Delete aircraft" />
                </DangerZone>
            )}
        </LogbookPage>
    );
}

function getAircraftFormValues(formData: FormData): AircraftFormValues {
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

async function handleNewAircraft(c: AppRequestContext) {
    const formData = await c.req.formData();
    const values = getAircraftFormValues(formData);
    const result = ResourceSchema.safeParse(values);
    if (!result.success) {
        return c.render(
            <AircraftFormPage
                title="Add aircraft"
                submitLabel="Add aircraft"
                values={values}
                errors={result.error.issues.map((issue) => issue.message)}
            />,
        );
    }
    await getAppContext(c)
        .db.insert(aircrafts)
        .values({
            userUuid: getAppContext(c).getUser().uuid,
            name: result.data.name,
            previousJumpCount: result.data.previousCount,
            description: result.data.description || null,
        });
    return c.redirect(routes.aircraftList({}));
}

async function renderAircraftList(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const rows = await db
        .select()
        .from(aircrafts)
        .where(eq(aircrafts.userUuid, userUuid))
        .orderBy(aircrafts.name);

    return c.render(
        <LogbookPage title="Aircraft">
            <div className="flex flex-wrap items-center gap-3">
                <a
                    href={routes.aircraftNew({})}
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
                    Add aircraft
                </a>
            </div>
            {rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        No aircraft yet.
                    </p>
                </div>
            ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {rows.map((aircraft) => (
                        <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-black/30">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                                        {aircraft.name}
                                        {aircraft.archived && (
                                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                Archived
                                            </span>
                                        )}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        Previous jumps:{" "}
                                        {aircraft.previousJumpCount}
                                    </p>
                                    {aircraft.description && (
                                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                            {aircraft.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                                <a
                                    href={routes.aircraftEdit({
                                        uuid: aircraft.uuid,
                                    })}
                                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-indigo-400/40"
                                >
                                    Edit
                                </a>
                                <form
                                    method="post"
                                    action={routes.aircraftEdit({
                                        uuid: aircraft.uuid,
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
                                        value={String(!aircraft.archived)}
                                    />
                                    <button
                                        type="submit"
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-indigo-400/40"
                                    >
                                        {aircraft.archived
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

async function renderEditAircraft(c: AppRequestContext, deleteError?: string) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const { uuid } = routes.aircraftEdit.params(c);
    if (!uuid) {
        return c.notFound();
    }
    const aircraft = await db
        .select()
        .from(aircrafts)
        .where(and(eq(aircrafts.uuid, uuid), eq(aircrafts.userUuid, userUuid)))
        .get();
    if (!aircraft) {
        return c.notFound();
    }
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
            deleteError={deleteError}
        />,
    );
}

async function handleEditAircraft(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const { uuid } = routes.aircraftEdit.params(c);
    if (!uuid) {
        return c.notFound();
    }
    const formData = await c.req.formData();
    if (formData.get("action") === "delete") {
        const usedByJump = await db
            .select({ uuid: jumps.uuid })
            .from(jumps)
            .where(eq(jumps.aircraftUuid, uuid))
            .limit(1)
            .get();
        if (usedByJump) {
            return renderEditAircraft(
                c,
                "Cannot delete an aircraft that is used by jumps. Archive it instead.",
            );
        }
        const deleted = await db
            .delete(aircrafts)
            .where(
                and(eq(aircrafts.uuid, uuid), eq(aircrafts.userUuid, userUuid)),
            )
            .returning({ uuid: aircrafts.uuid })
            .get();
        return deleted ? c.redirect(routes.aircraftList({})) : c.notFound();
    }
    if (formData.get("action") === "toggleArchive") {
        const update = await db
            .update(aircrafts)
            .set({ archived: formData.get("archived") === "true" })
            .where(
                and(eq(aircrafts.uuid, uuid), eq(aircrafts.userUuid, userUuid)),
            )
            .returning({ uuid: aircrafts.uuid })
            .get();
        return update ? c.redirect(routes.aircraftList({})) : c.notFound();
    }
    const values = getAircraftFormValues(formData);
    const result = ResourceSchema.safeParse(values);
    const formProps = {
        title: "Edit aircraft",
        submitLabel: "Save aircraft",
        values,
    };
    if (!result.success) {
        return c.render(
            <AircraftFormPage
                {...formProps}
                errors={result.error.issues.map((issue) => issue.message)}
            />,
        );
    }
    const update = await db
        .update(aircrafts)
        .set({
            name: result.data.name,
            previousJumpCount: result.data.previousCount,
            description: result.data.description || null,
        })
        .where(and(eq(aircrafts.uuid, uuid), eq(aircrafts.userUuid, userUuid)))
        .returning({ uuid: aircrafts.uuid })
        .get();
    if (!update) {
        return c.notFound();
    }
    return c.redirect(routes.aircraftList({}));
}

app.get(routes.aircraftList.route, renderAircraftList);
app.get(routes.aircraftNew.route, (c) =>
    c.render(
        <AircraftFormPage title="Add aircraft" submitLabel="Add aircraft" />,
    ),
);
app.post(routes.aircraftNew.route, handleNewAircraft);
app.get(routes.aircraftEdit.route, (c) => renderEditAircraft(c));
app.post(routes.aircraftEdit.route, handleEditAircraft);
