import { Button, ButtonLink, Checkbox, FileInput } from "@/components/form";
import { ExportIcon, ImportIcon } from "@/components/icons";
import { SectionHeader } from "@/components/ui/section-header";
import * as routes from "@/routes";
import { LogbookPage } from "@/app/logbook-page";
import {
    ExportCurlHelp,
    TransferFormatHelp,
} from "@/route-handlers/logbook/transfer/format-help";
import { AgentMigrationCard } from "@/route-handlers/logbook/transfer/agent-migration";

interface TransferPageProps {
    errors?: string[];
    notice?: string;
    clearAll?: boolean;
}

function ExportSection() {
    return (
        <div>
            <SectionHeader
                icon={<ExportIcon className="h-5 w-5" />}
                iconClassName="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
                title="Export"
                description="Download your logbook as CSV. The format uses names instead of internal IDs and can be re-imported. It also opens in Excel, LibreOffice, Google Docs, and other spreadsheet tools."
            />
            <ButtonLink
                href={routes.logbook.transfer.export({})}
                download
                variant="primary"
                className="mt-4 gap-1.5"
            >
                Export logbook
            </ButtonLink>
            <ExportCurlHelp />
        </div>
    );
}

function ImportSection(props: TransferPageProps) {
    return (
        <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
            <SectionHeader
                icon={<ImportIcon className="h-5 w-5" />}
                iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                title="Import"
                description="Import a Loki formatted CSV or Skydiving Logbook XML (skydiving_logbook.xml) file. Existing gear, locations, aircraft, and jump types are matched by name. Unknown jump items are created automatically."
            />
            {props.notice && (
                <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {props.notice}
                </p>
            )}
            {props.errors && props.errors.length > 0 && (
                <ul className="mt-4 space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                    {props.errors.map((error) => (
                        <li key={error}>{error}</li>
                    ))}
                </ul>
            )}
            <form
                method="post"
                encType="multipart/form-data"
                className="mt-5 space-y-4"
            >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <FileInput
                        name="file"
                        label="Logbook file"
                        accept=".csv,.xml,text/csv,application/xml,text/xml"
                        required
                        className="min-w-0 flex-1"
                    />
                    <Button
                        type="submit"
                        variant="secondary"
                        className="h-10 shrink-0"
                    >
                        Import logbook
                    </Button>
                </div>
                <div className="space-y-1.5">
                    <Checkbox
                        name="clearAll"
                        value="true"
                        label="Clear all previous data"
                        checked={props.clearAll}
                    />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Removes all existing jumps, gear, locations, aircraft,
                        and jump types before importing.
                    </p>
                </div>
            </form>
            <TransferFormatHelp />
        </div>
    );
}

/** Renders the logbook import and export page. */
export function TransferPage(props: TransferPageProps) {
    return (
        <LogbookPage title="Import or export logbook">
            <div className="space-y-6">
                <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <ExportSection />
                    <ImportSection
                        errors={props.errors}
                        notice={props.notice}
                        clearAll={props.clearAll}
                    />
                </section>
                <AgentMigrationCard />
            </div>
        </LogbookPage>
    );
}
