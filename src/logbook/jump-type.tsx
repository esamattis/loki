import { and, eq } from "drizzle-orm";
import { getAppContext, app, type AppRequestContext } from "../app";
import { FormActions, Input, NumberInput, Textarea } from "../components/form";
import { ErrorList } from "../components/feedback";
import * as routes from "../routes";
import { jumpTypes } from "../schema";
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
}) {
    return (
        <LogbookPage title={props.title}>
            <JumpTypeForm
                values={props.values}
                errors={props.errors}
                submitLabel={props.submitLabel}
            />
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
            <a
                href={routes.jumpTypeNew({})}
                className="inline-block rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
                Add jump type
            </a>
            {rows.length === 0 ? (
                <p className="rounded-lg bg-white p-5 text-gray-600 shadow-sm">
                    No jump types yet.
                </p>
            ) : (
                <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm">
                    {rows.map((item) => (
                        <li className="flex items-center justify-between gap-4 p-5">
                            <div>
                                <p className="font-semibold">
                                    {item.name}
                                    {item.archived && (
                                        <span className="ml-2 text-sm font-normal text-gray-500">
                                            Archived
                                        </span>
                                    )}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Previous uses: {item.previousUsageCount}
                                </p>
                                {item.description && (
                                    <p className="mt-1 text-sm text-gray-600">
                                        {item.description}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <a
                                    href={routes.jumpTypeEdit({
                                        uuid: item.uuid,
                                    })}
                                    className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
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
                                        className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
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
    return c.render(
        <JumpTypeFormPage
            title="Edit jump type"
            submitLabel="Save jump type"
            values={{
                name: item.name,
                previousCount: String(item.previousUsageCount),
                description: item.description ?? undefined,
            }}
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
        return c.render(
            <JumpTypeFormPage
                {...formProps}
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
