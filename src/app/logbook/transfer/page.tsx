import { useId } from "hono/jsx";
import {
    Button,
    buttonClassName,
    Checkbox,
    FileInput,
} from "@/components/form";
import { ExportIcon, ImportIcon } from "@/components/icons";
import { Script } from "@/components/script";
import { SectionHeader } from "@/components/ui/section-header";
import { LogbookPage } from "@/app/logbook-page";
import {
    ExportCurlHelp,
    TransferFormatHelp,
} from "@/route-handlers/logbook/transfer/format-help";
import { AgentMigrationCard } from "@/route-handlers/logbook/transfer/agent-migration";
import { $select } from "@/utils";
import { ExportLogbookButton } from "@/components/export-logbook-button";

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
            <ExportLogbookButton className="mt-4 gap-1.5" />
            <ExportCurlHelp />
        </div>
    );
}

function ImportSection(props: TransferPageProps) {
    const fileInputId = useId();
    const submitButtonId = useId();
    const overlayId = useId();
    const submitButtonClassName = "h-10 shrink-0";
    const idleSubmitClassName = buttonClassName({
        variant: "secondary",
        className: submitButtonClassName,
    });
    const readySubmitClassName = buttonClassName({
        variant: "primary",
        className: submitButtonClassName,
    });
    return (
        <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
            <SectionHeader
                icon={<ImportIcon className="h-5 w-5" />}
                iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                title="Import"
                description="Import a Loki formatted CSV or Skydiving Logbook XML (skydiving_logbook.xml) file. Drop a file anywhere on this page, or choose one below. Existing gear, locations, aircraft, and jump types are matched by name. Unknown jump items are created automatically."
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
                        id={fileInputId}
                        name="file"
                        label="Logbook file"
                        accept=".csv,.xml,text/csv,application/xml,text/xml"
                        required
                        className="min-w-0 flex-1"
                    />
                    <Button
                        id={submitButtonId}
                        type="submit"
                        variant="secondary"
                        className={submitButtonClassName}
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
            <div
                id={overlayId}
                className="pointer-events-none fixed inset-0 z-50 hidden items-center justify-center bg-emerald-950/40 p-6 backdrop-blur-sm dark:bg-emerald-950/60"
                aria-hidden="true"
            >
                <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-white/95 px-8 py-6 text-center shadow-xl dark:border-emerald-500 dark:bg-slate-900/95">
                    <p className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">
                        Drop logbook file
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        CSV or Skydiving Logbook XML
                    </p>
                </div>
            </div>
            <Script
                $deps={[$select]}
                $args={[
                    {
                        fileInputId,
                        submitButtonId,
                        overlayId,
                        idleSubmitClassName,
                        readySubmitClassName,
                    },
                ]}
                $exec={$setupImportFileDrop}
            />
            <TransferFormatHelp />
        </div>
    );
}

function $setupImportFileDrop(config: {
    fileInputId: string;
    submitButtonId: string;
    overlayId: string;
    idleSubmitClassName: string;
    readySubmitClassName: string;
}) {
    const fileInput = $select.id(config.fileInputId, HTMLInputElement);
    const submitButton = $select.id(config.submitButtonId, HTMLButtonElement);
    const overlay = $select.id(config.overlayId, HTMLElement);
    let dragDepth = 0;

    function hasFiles(event: DragEvent): boolean {
        return Array.from(event.dataTransfer?.types ?? []).includes("Files");
    }

    function isImportFile(file: File): boolean {
        const name = file.name.toLowerCase();
        return name.endsWith(".csv") || name.endsWith(".xml");
    }

    function syncSubmitButton() {
        const hasFile = (fileInput.files?.length ?? 0) > 0;
        submitButton.className = hasFile
            ? config.readySubmitClassName
            : config.idleSubmitClassName;
    }

    function showOverlay() {
        overlay.classList.remove("hidden");
        overlay.classList.add("flex");
    }

    function hideOverlay() {
        dragDepth = 0;
        overlay.classList.add("hidden");
        overlay.classList.remove("flex");
    }

    fileInput.addEventListener("change", syncSubmitButton);
    syncSubmitButton();

    window.addEventListener("dragenter", (event) => {
        if (!hasFiles(event)) {
            return;
        }
        event.preventDefault();
        dragDepth += 1;
        showOverlay();
    });

    window.addEventListener("dragleave", (event) => {
        if (!hasFiles(event)) {
            return;
        }
        event.preventDefault();
        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0) {
            hideOverlay();
        }
    });

    window.addEventListener("dragover", (event) => {
        if (!hasFiles(event)) {
            return;
        }
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "copy";
        }
    });

    window.addEventListener("drop", (event) => {
        if (!hasFiles(event)) {
            return;
        }
        event.preventDefault();
        hideOverlay();
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) {
            return;
        }
        const file = files.item(0);
        if (!file || !isImportFile(file)) {
            return;
        }
        const transfer = new DataTransfer();
        transfer.items.add(file);
        fileInput.files = transfer.files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
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
