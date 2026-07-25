import { LogbookPage } from "@/app/logbook-page";
import { FormActions, Input, NumberInput, Textarea } from "@/components/form";
import { ErrorList } from "@/components/feedback";
import { RedirectBackAfterPost } from "@/components/return-after-form-post";
import { ArchiveToggleForm } from "@/components/ui/archive-toggle-form";
import { ConfirmDangerButton } from "@/components/ui/confirm-danger-button";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { DangerZone } from "@/components/ui/danger-zone";
import { MergeIntoForm } from "@/components/ui/merge-into-form";
import {
    RecentJumpsSection,
    type JumpListItem,
} from "@/route-handlers/logbook/components/jump-list";
import * as routes from "@/routes";

export interface GearFormValues {
    name?: string;
    previousCount?: string;
    description?: string;
}

export function GearFormPage(props: {
    title: string;
    submitLabel: string;
    values?: GearFormValues;
    errors?: string[];
    canDelete?: boolean;
    archived?: boolean;
    dangerError?: string;
    mergeOptions?: { uuid: string; name: string }[];
    recentJumps?: JumpListItem[];
    recordedUsageCount?: number;
}) {
    const values = props.values ?? {};
    return (
        <LogbookPage title={props.title}>
            <a
                href={routes.logbook.gear.index({})}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
                ← Back to gear
            </a>
            {props.archived && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        Archived
                    </span>
                </p>
            )}
            <form
                method="post"
                data-loki-confirm={props.title}
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
                    cancelHref={routes.logbook.gear.index({})}
                />
            </form>
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
                            description="Reassign all jumps using this gear to another gear item, add previous usage counts together, and delete this gear."
                            selectLabel="Merge into"
                            buttonLabel="Merge gear"
                        />
                    )}
                    <form
                        method="post"
                        className="mb-4 border-b border-red-200 pb-4 dark:border-red-900/60"
                    >
                        <input
                            type="hidden"
                            name="action"
                            value="convertToJumpType"
                        />
                        <p className="mb-3 text-sm text-red-700/90 dark:text-red-300/90">
                            Convert this gear into a jump type. All jumps using
                            this gear will reference the new jump type instead,
                            and this gear will be deleted.
                        </p>
                        <ConfirmDangerButton
                            label="Convert to jump type"
                            confirmLabel="Confirm convert"
                        />
                    </form>
                    <ConfirmDeleteButton label="Delete gear" />
                </DangerZone>
            )}
            {props.recentJumps !== undefined &&
                props.recordedUsageCount !== undefined && (
                    <RecentJumpsSection
                        title="Recent jumps with this gear"
                        jumps={props.recentJumps}
                        emptyMessage="No jumps use this gear yet."
                        recordedUsageCount={props.recordedUsageCount}
                    />
                )}
        </LogbookPage>
    );
}
