import { Checkbox } from "../components/form";
import * as routes from "../routes";
import { LogbookPage } from "./layout";
import { ExportCurlHelp, TransferFormatHelp } from "./transfer-format-help";

interface TransferPageProps {
    errors?: string[];
    notice?: string;
    clearAll?: boolean;
}

/** Renders the logbook import and export page. */
export function TransferPage(props: TransferPageProps) {
    return (
        <LogbookPage title="Import or export logbook">
            <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                    <div className="flex items-center gap-3">
                        <span
                            aria-hidden="true"
                            className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-indigo-100 text-indigo-600"
                        >
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12"
                                />
                            </svg>
                        </span>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Export
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Download your logbook as a JSON Lines file. It
                                uses names instead of internal IDs.
                            </p>
                        </div>
                    </div>
                    <a
                        href={routes.logbookExport({})}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    >
                        Export logbook
                    </a>
                    <ExportCurlHelp />
                </div>
                <div className="border-t border-slate-200 pt-6">
                    <div className="flex items-center gap-3">
                        <span
                            aria-hidden="true"
                            className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"
                        >
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M17 14l-5 5m0 0l-5-5m5 5V7"
                                />
                            </svg>
                        </span>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Import
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Import a JSON Lines or Skydiving Logbook XML
                                file. Existing gear, locations, aircraft, and
                                jump types are matched by name.
                            </p>
                        </div>
                    </div>
                    {props.notice && (
                        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                            {props.notice}
                        </p>
                    )}
                    {props.errors && props.errors.length > 0 && (
                        <ul className="mt-4 space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
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
                            <label className="block flex-1 text-sm font-medium text-slate-700">
                                Logbook file
                                <input
                                    type="file"
                                    name="file"
                                    accept=".jsonl,.xml,application/x-ndjson,application/json,application/xml,text/xml"
                                    required
                                    className="mt-1.5 block w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-700 file:mr-3 file:cursor-pointer file:rounded-l-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-indigo-700"
                                />
                            </label>
                            <button
                                type="submit"
                                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            >
                                Import logbook
                            </button>
                        </div>
                        <div className="space-y-1.5">
                            <Checkbox
                                name="clearAll"
                                value="true"
                                label="Clear all previous data"
                                checked={props.clearAll}
                            />
                            <p className="text-sm text-slate-500">
                                Removes all existing jumps, gear, locations,
                                aircraft, and jump types before importing.
                            </p>
                        </div>
                    </form>
                    <TransferFormatHelp />
                </div>
            </section>
        </LogbookPage>
    );
}
