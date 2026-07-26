import { AppPage } from "@/core/app-page";
import {
    FormActions,
    Input,
    NumberInput,
    Textarea,
} from "@/core/components/form";
import { ErrorList } from "@/core/components/feedback";
import { RedirectBackAfterPost } from "@/core/components/return-after-form-post";
import { ArchiveToggleForm } from "@/app/components/archive-toggle-form";
import { ConfirmDeleteButton } from "@/core/components/ui/confirm-delete-button";
import { DangerZone } from "@/core/components/ui/danger-zone";
import { MergeIntoForm } from "@/app/components/merge-into-form";
import {
    RecentJumpsSection,
    type JumpListItem,
} from "@/app/logbook/components/jump-list";
import { getFormString } from "@/core/utils";
import * as routes from "@/app/routes";

export interface AircraftFormValues {
    name?: string;
    previousCount?: string;
    description?: string;
}

export function AircraftForm(props: {
    values?: AircraftFormValues;
    errors?: string[];
    submitLabel: string;
    confirmationTitle: string;
}) {
    const values = props.values ?? {};

    return (
        <form
            method="post"
            data-loki-confirm={props.confirmationTitle}
            className="max-w-xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
            <RedirectBackAfterPost />
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
                cancelHref={routes.logbook.aircraft.index({})}
            />
        </form>
    );
}

export function AircraftFormPage(props: {
    title: string;
    submitLabel: string;
    values?: AircraftFormValues;
    errors?: string[];
    canDelete?: boolean;
    archived?: boolean;
    dangerError?: string;
    mergeOptions?: { uuid: string; name: string }[];
    recentJumps?: JumpListItem[];
    recordedUsageCount?: number;
}) {
    return (
        <AppPage title={props.title}>
            <a
                href={routes.logbook.aircraft.index({})}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
                ← Back to aircraft
            </a>
            {props.archived && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        Archived
                    </span>
                </p>
            )}
            <AircraftForm
                values={props.values}
                errors={props.errors}
                submitLabel={props.submitLabel}
                confirmationTitle={props.title}
            />
            {props.archived !== undefined && (
                <ArchiveToggleForm archived={props.archived} />
            )}
            {props.canDelete && (
                <DangerZone className="max-w-xl">
                    {props.dangerError && (
                        <ErrorList
                            errors={[props.dangerError]}
                            className="mb-3 border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                        />
                    )}
                    {props.mergeOptions && (
                        <MergeIntoForm
                            options={props.mergeOptions}
                            description="Reassign all jumps using this aircraft to another aircraft, add previous jump counts together, and delete this aircraft."
                            selectLabel="Merge into"
                            buttonLabel="Merge aircraft"
                        />
                    )}
                    <ConfirmDeleteButton label="Delete aircraft" />
                </DangerZone>
            )}
            {props.recentJumps !== undefined &&
                props.recordedUsageCount !== undefined && (
                    <RecentJumpsSection
                        title="Recent jumps with this aircraft"
                        jumps={props.recentJumps}
                        emptyMessage="No jumps use this aircraft yet."
                        recordedUsageCount={props.recordedUsageCount}
                    />
                )}
        </AppPage>
    );
}

export function getAircraftFormValues(formData: FormData): AircraftFormValues {
    return {
        name: getFormString(formData, "name"),
        previousCount: getFormString(formData, "previousCount"),
        description: getFormString(formData, "description"),
    };
}
