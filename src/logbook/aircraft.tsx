import { and, eq } from "drizzle-orm";
import { getAppContext, app, type AppRequestContext } from "../app";
import { FormActions, Input, NumberInput, Textarea } from "../components/form";
import { ErrorList } from "../components/feedback";
import * as routes from "../routes";
import { aircrafts } from "../schema";
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
            className="max-w-xl space-y-5 rounded-lg bg-white p-5 shadow-sm"
        >
            <ErrorList
                errors={props.errors ?? []}
                className="border-red-300 bg-red-50 text-red-800"
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
}) {
    return (
        <LogbookPage title={props.title}>
            <AircraftForm
                values={props.values}
                errors={props.errors}
                submitLabel={props.submitLabel}
            />
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
            <a
                href={routes.aircraftNew({})}
                className="inline-block rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
                Add aircraft
            </a>
            {rows.length === 0 ? (
                <p className="rounded-lg bg-white p-5 text-gray-600 shadow-sm">
                    No aircraft yet.
                </p>
            ) : (
                <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm">
                    {rows.map((aircraft) => (
                        <li className="flex items-center justify-between gap-4 p-5">
                            <div>
                                <p className="font-semibold">
                                    {aircraft.name}
                                    {aircraft.archived && (
                                        <span className="ml-2 text-sm font-normal text-gray-500">
                                            Archived
                                        </span>
                                    )}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Previous jumps: {aircraft.previousJumpCount}
                                </p>
                                {aircraft.description && (
                                    <p className="mt-1 text-sm text-gray-600">
                                        {aircraft.description}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <a
                                    href={routes.aircraftEdit({
                                        uuid: aircraft.uuid,
                                    })}
                                    className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
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
                                        className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
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

async function renderEditAircraft(c: AppRequestContext) {
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
app.get(routes.aircraftEdit.route, renderEditAircraft);
app.post(routes.aircraftEdit.route, handleEditAircraft);
