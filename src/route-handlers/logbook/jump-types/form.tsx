import { LogbookPage } from "@/app/authenticated-page";
import { FormActions, Input, NumberInput, Textarea } from "@/components/form";
import { ErrorList } from "@/components/feedback";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { DangerZone } from "@/components/ui/danger-zone";
import { MergeIntoForm } from "@/components/ui/merge-into-form";
import {
    RecentJumpsSection,
    type JumpListItem,
} from "@/route-handlers/logbook/components/jump-list";
import * as routes from "@/routes";

export interface JumpTypeFormValues {
    name?: string;
    previousCount?: string;
    description?: string;
}

export function JumpTypeFormPage(props: {
    title: string;
    submitLabel: string;
    values?: JumpTypeFormValues;
    errors?: string[];
    canDelete?: boolean;
    dangerError?: string;
    mergeOptions?: { uuid: string; name: string }[];
    recentJumps?: JumpListItem[];
}) {
    const values = props.values ?? {};
    return (
        <LogbookPage title={props.title}>
            <a
                href={routes.logbook.jumpTypes.index({})}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
                ← Back to jump types
            </a>
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
                    cancelHref={routes.logbook.jumpTypes.index({})}
                />
            </form>
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
