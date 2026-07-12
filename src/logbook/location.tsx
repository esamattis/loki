import { and, eq } from "drizzle-orm";
import { getAppContext, app, type AppRequestContext } from "../app";
import { FormActions, Input, NumberInput, Textarea } from "../components/form";
import { ErrorList } from "../components/feedback";
import * as routes from "../routes";
import { locations } from "../schema";
import { LogbookPage } from "./layout";
import { ResourceSchema } from "./resource";

interface LocationFormValues {
    name?: string;
    previousCount?: string;
    description?: string;
}

function LocationForm(props: {
    values?: LocationFormValues;
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
                cancelHref={routes.locationList({})}
            />
        </form>
    );
}

function LocationFormPage(props: {
    title: string;
    submitLabel: string;
    values?: LocationFormValues;
    errors?: string[];
}) {
    return (
        <LogbookPage title={props.title}>
            <LocationForm
                values={props.values}
                errors={props.errors}
                submitLabel={props.submitLabel}
            />
        </LogbookPage>
    );
}

function getLocationFormValues(formData: FormData): LocationFormValues {
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

async function handleNewLocation(c: AppRequestContext) {
    const formData = await c.req.formData();
    const values = getLocationFormValues(formData);
    const result = ResourceSchema.safeParse(values);
    if (!result.success) {
        return c.render(
            <LocationFormPage
                title="Add location"
                submitLabel="Add location"
                values={values}
                errors={result.error.issues.map((issue) => issue.message)}
            />,
        );
    }
    await getAppContext(c)
        .db.insert(locations)
        .values({
            userUuid: getAppContext(c).getUser().uuid,
            name: result.data.name,
            previousJumpCount: result.data.previousCount,
            description: result.data.description || null,
        });
    return c.redirect(routes.locationList({}));
}

async function renderLocationList(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const rows = await db
        .select()
        .from(locations)
        .where(eq(locations.userUuid, userUuid))
        .orderBy(locations.name);

    return c.render(
        <LogbookPage title="Locations">
            <a
                href={routes.locationNew({})}
                className="inline-block rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
                Add location
            </a>
            {rows.length === 0 ? (
                <p className="rounded-lg bg-white p-5 text-gray-600 shadow-sm">
                    No locations yet.
                </p>
            ) : (
                <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm">
                    {rows.map((location) => (
                        <li className="flex items-center justify-between gap-4 p-5">
                            <div>
                                <p className="font-semibold">{location.name}</p>
                                <p className="text-sm text-gray-600">
                                    Previous jumps: {location.previousJumpCount}
                                </p>
                                {location.description && (
                                    <p className="mt-1 text-sm text-gray-600">
                                        {location.description}
                                    </p>
                                )}
                            </div>
                            <a
                                href={routes.locationEdit({
                                    uuid: location.uuid,
                                })}
                                className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Edit
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </LogbookPage>,
    );
}

async function renderEditLocation(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const { uuid } = routes.locationEdit.params(c);
    if (!uuid) {
        return c.notFound();
    }
    const location = await db
        .select()
        .from(locations)
        .where(and(eq(locations.uuid, uuid), eq(locations.userUuid, userUuid)))
        .get();
    if (!location) {
        return c.notFound();
    }
    return c.render(
        <LocationFormPage
            title="Edit location"
            submitLabel="Save location"
            values={{
                name: location.name,
                previousCount: String(location.previousJumpCount),
                description: location.description ?? undefined,
            }}
        />,
    );
}

async function handleEditLocation(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const { uuid } = routes.locationEdit.params(c);
    if (!uuid) {
        return c.notFound();
    }
    const values = getLocationFormValues(await c.req.formData());
    const result = ResourceSchema.safeParse(values);
    const formProps = {
        title: "Edit location",
        submitLabel: "Save location",
        values,
    };
    if (!result.success) {
        return c.render(
            <LocationFormPage
                {...formProps}
                errors={result.error.issues.map((issue) => issue.message)}
            />,
        );
    }
    const update = await db
        .update(locations)
        .set({
            name: result.data.name,
            previousJumpCount: result.data.previousCount,
            description: result.data.description || null,
        })
        .where(and(eq(locations.uuid, uuid), eq(locations.userUuid, userUuid)))
        .returning({ uuid: locations.uuid })
        .get();
    if (!update) {
        return c.notFound();
    }
    return c.redirect(routes.locationList({}));
}

app.get(routes.locationList.route, renderLocationList);
app.get(routes.locationNew.route, (c) =>
    c.render(
        <LocationFormPage title="Add location" submitLabel="Add location" />,
    ),
);
app.post(routes.locationNew.route, handleNewLocation);
app.get(routes.locationEdit.route, renderEditLocation);
app.post(routes.locationEdit.route, handleEditLocation);
