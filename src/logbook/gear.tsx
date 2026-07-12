import { and, eq } from "drizzle-orm";
import { getAppContext, app, type AppRequestContext } from "../app";
import { FormActions, Input, NumberInput, Textarea } from "../components/form";
import { ErrorList } from "../components/feedback";
import * as routes from "../routes";
import { gear } from "../schema";
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
}) {
    return (
        <LogbookPage title={props.title}>
            <GearForm
                values={props.values}
                errors={props.errors}
                submitLabel={props.submitLabel}
            />
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
            <a
                href={routes.gearNew({})}
                className="inline-block rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
                Add gear
            </a>
            {rows.length === 0 ? (
                <p className="rounded-lg bg-white p-5 text-gray-600 shadow-sm">
                    No gear yet.
                </p>
            ) : (
                <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm">
                    {rows.map((item) => (
                        <li className="flex items-center justify-between gap-4 p-5">
                            <div>
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-sm text-gray-600">
                                    Previous uses: {item.previousUsageCount}
                                </p>
                                {item.description && (
                                    <p className="mt-1 text-sm text-gray-600">
                                        {item.description}
                                    </p>
                                )}
                            </div>
                            <a
                                href={routes.gearEdit({ uuid: item.uuid })}
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

async function renderEditGear(c: AppRequestContext) {
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
    return c.render(
        <GearFormPage
            title="Edit gear"
            submitLabel="Save gear"
            values={{
                name: item.name,
                previousCount: String(item.previousUsageCount),
                description: item.description ?? undefined,
            }}
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
    const values = getGearFormValues(await c.req.formData());
    const result = ResourceSchema.safeParse(values);
    const formProps = {
        title: "Edit gear",
        submitLabel: "Save gear",
        values,
    };
    if (!result.success) {
        return c.render(
            <GearFormPage
                {...formProps}
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
app.get(routes.gearEdit.route, renderEditGear);
app.post(routes.gearEdit.route, handleEditGear);
