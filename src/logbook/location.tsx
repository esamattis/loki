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
import { jumps, locations } from "@/schema";
import {
    getRecentJumpsForItem,
    RecentJumpsSection,
    type JumpListItem,
} from "@/logbook/jump-list";
import { LogbookPage } from "@/logbook/layout";
import { getFormString, ResourceSchema } from "@/logbook/resource";

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
                value={values.description}
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
    canDelete?: boolean;
    dangerError?: string;
    mergeOptions?: { uuid: string; name: string }[];
    recentJumps?: JumpListItem[];
}) {
    return (
        <LogbookPage title={props.title}>
            <a
                href={routes.locationList({})}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
                ← Back to locations
            </a>
            <LocationForm
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
                            description="Reassign all jumps using this location to another location, add previous jump counts together, and delete this location."
                            selectLabel="Merge into"
                            buttonLabel="Merge location"
                        />
                    )}
                    <ConfirmDeleteButton label="Delete location" />
                </DangerZone>
            )}
            {props.recentJumps !== undefined && (
                <RecentJumpsSection
                    title="Recent jumps at this location"
                    jumps={props.recentJumps}
                    emptyMessage="No jumps use this location yet."
                />
            )}
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
            <div className="flex flex-wrap items-center gap-3">
                <ButtonLink
                    href={routes.locationNew({})}
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
                    Add location
                </ButtonLink>
            </div>
            {rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        No locations yet.
                    </p>
                </div>
            ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {rows.map((location) => (
                        <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-black/30">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                                        {location.name}
                                        {location.archived && (
                                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                Archived
                                            </span>
                                        )}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        Previous jumps:{" "}
                                        {location.previousJumpCount}
                                    </p>
                                    {location.description && (
                                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                            {location.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                                <ButtonLink
                                    href={routes.locationEdit({
                                        uuid: location.uuid,
                                    })}
                                    variant="secondary"
                                    size="sm"
                                >
                                    Edit
                                </ButtonLink>
                                <form
                                    method="post"
                                    action={routes.locationEdit({
                                        uuid: location.uuid,
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
                                        value={String(!location.archived)}
                                    />
                                    <Button
                                        type="submit"
                                        variant="secondary"
                                        size="sm"
                                    >
                                        {location.archived
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

async function renderEditLocation(c: AppRequestContext, dangerError?: string) {
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
    const mergeOptions = await db
        .select({ uuid: locations.uuid, name: locations.name })
        .from(locations)
        .where(
            and(
                eq(locations.userUuid, userUuid),
                ne(locations.uuid, location.uuid),
            ),
        )
        .orderBy(locations.name);
    const recentJumps = await getRecentJumpsForItem(
        c,
        userUuid,
        getAppContext(c).getUser().options,
        location.uuid,
        "location",
    );
    return c.render(
        <LocationFormPage
            title="Edit location"
            submitLabel="Save location"
            values={{
                name: location.name,
                previousCount: String(location.previousJumpCount),
                description: location.description ?? undefined,
            }}
            canDelete
            dangerError={dangerError}
            mergeOptions={mergeOptions}
            recentJumps={recentJumps}
        />,
    );
}

async function mergeLocation(
    c: AppRequestContext,
    sourceUuid: string,
    targetUuid: string,
) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    if (!targetUuid || targetUuid === sourceUuid) {
        return renderEditLocation(
            c,
            "Select a different location to merge into.",
        );
    }
    const source = await db
        .select()
        .from(locations)
        .where(
            and(
                eq(locations.uuid, sourceUuid),
                eq(locations.userUuid, userUuid),
            ),
        )
        .get();
    const target = await db
        .select()
        .from(locations)
        .where(
            and(
                eq(locations.uuid, targetUuid),
                eq(locations.userUuid, userUuid),
            ),
        )
        .get();
    if (!source || !target) {
        return renderEditLocation(
            c,
            "Select a different location to merge into.",
        );
    }
    await db.batch([
        db
            .update(jumps)
            .set({ locationUuid: target.uuid })
            .where(eq(jumps.locationUuid, source.uuid)),
        db
            .update(locations)
            .set({
                previousJumpCount:
                    target.previousJumpCount + source.previousJumpCount,
            })
            .where(eq(locations.uuid, target.uuid)),
        db.delete(locations).where(eq(locations.uuid, source.uuid)),
    ]);
    return c.redirect(routes.locationEdit({ uuid: target.uuid }));
}

async function handleEditLocation(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const { uuid } = routes.locationEdit.params(c);
    if (!uuid) {
        return c.notFound();
    }
    const formData = await c.req.formData();
    if (formData.get("action") === "delete") {
        const usedByJump = await db
            .select({ uuid: jumps.uuid })
            .from(jumps)
            .where(eq(jumps.locationUuid, uuid))
            .limit(1)
            .get();
        if (usedByJump) {
            return renderEditLocation(
                c,
                "Cannot delete a location that is used by jumps. Archive it instead.",
            );
        }
        const deleted = await db
            .delete(locations)
            .where(
                and(eq(locations.uuid, uuid), eq(locations.userUuid, userUuid)),
            )
            .returning({ uuid: locations.uuid })
            .get();
        return deleted ? c.redirect(routes.locationList({})) : c.notFound();
    }
    if (formData.get("action") === "merge") {
        return mergeLocation(c, uuid, getFormString(formData, "targetUuid"));
    }
    if (formData.get("action") === "toggleArchive") {
        const update = await db
            .update(locations)
            .set({ archived: formData.get("archived") === "true" })
            .where(
                and(eq(locations.uuid, uuid), eq(locations.userUuid, userUuid)),
            )
            .returning({ uuid: locations.uuid })
            .get();
        return update ? c.redirect(routes.locationList({})) : c.notFound();
    }
    const values = getLocationFormValues(formData);
    const result = ResourceSchema.safeParse(values);
    const formProps = {
        title: "Edit location",
        submitLabel: "Save location",
        values,
    };
    if (!result.success) {
        const recentJumps = await getRecentJumpsForItem(
            c,
            userUuid,
            getAppContext(c).getUser().options,
            uuid,
            "location",
        );
        return c.render(
            <LocationFormPage
                {...formProps}
                recentJumps={recentJumps}
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
app.get(routes.locationEdit.route, (c) => renderEditLocation(c));
app.post(routes.locationEdit.route, handleEditLocation);
