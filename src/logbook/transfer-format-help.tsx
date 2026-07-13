const JSONL_EXAMPLE = `{"type":"aircraft","name":"Twin Otter","previousCount":120,"description":"Fast turbine aircraft"}
{"type":"gear","name":"Navigator 260","previousCount":42,"description":"Main canopy"}
{"type":"jumpType","name":"Formation skydiving","previousCount":18,"description":"Four-way training"}
{"type":"location","name":"Skydive Example","previousCount":300,"description":"Home drop zone"}
{"type":"jump","jumpNumber":301,"exitAltitude":4000,"openingAltitude":1000,"freefallTime":55,"location":"Skydive Example","aircraft":"Twin Otter","gear":["Navigator 260"],"jumpTypes":["Formation skydiving"],"description":"Training jump"}`;

import { useId } from "hono/jsx";
import { useAppContext } from "../app";
import { Code, Details } from "../components/ui";
import { Script } from "../components/helpers";
import * as routes from "../routes";
import { $assertElement } from "../utils";

/** Inline documentation for downloading the logbook export with curl over Basic auth. */
export function ExportCurlHelp() {
    const jsonlId = useId();
    const csvId = useId();
    const username = useAppContext().getUser().username;
    const jsonlPath = routes.logbookExport({}, { format: "jsonl" });
    const csvPath = routes.logbookExport({}, { format: "csv" });
    return (
        <Details
            summary="Download with curl"
            className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300"
            summaryClassName="font-medium text-slate-900 dark:text-slate-100"
        >
            <div className="mt-3 space-y-3">
                <p>
                    The export endpoint also accepts HTTP Basic authentication,
                    so you can download your logbook from the command line with
                    curl. These commands are meant for automated backups. Use
                    your username (or email) and account password:
                </p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                    JSON Lines
                </p>
                <Code
                    codeId={jsonlId}
                    codeProps={{ "data-export-path": jsonlPath }}
                >
                    {`curl -OJ -u ${username}:<password> '${jsonlPath}'`}
                </Code>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                    CSV
                </p>
                <Code
                    codeId={csvId}
                    codeProps={{ "data-export-path": csvPath }}
                >
                    {`curl -OJ -u ${username}:<password> '${csvPath}'`}
                </Code>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    The <code>-OJ</code> flags save the file using the name from
                    the response <code>Content-Disposition</code> header (
                    <code>jump-logbook.jsonl</code> or{" "}
                    <code>jump-logbook.csv</code>). Replace{" "}
                    <code>&lt;password&gt;</code> with your account password.
                    Without valid credentials the endpoint responds with HTTP
                    401.
                </p>
                <Script
                    $deps={[$assertElement]}
                    $args={[jsonlId, csvId, username]}
                    $exec={(jsonlId, csvId, username) => {
                        const origin = window.location.origin;
                        for (const id of [jsonlId, csvId]) {
                            const code = document.getElementById(id);
                            $assertElement(code, HTMLElement);
                            const exportPath =
                                code.getAttribute("data-export-path") ?? "";
                            code.textContent = `curl -OJ -u ${username}:<password> '${origin}${exportPath}'`;
                        }
                    }}
                />
            </div>
        </Details>
    );
}

export function TransferFormatHelp() {
    return (
        <Details
            summary="Export file format"
            className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300"
            summaryClassName="font-medium text-slate-900 dark:text-slate-100"
        >
            <div className="mt-3 space-y-3">
                <p>
                    Export files use JSON Lines: one JSON object per line.
                    Resources appear before jumps, which refer to them by name.
                </p>
                <p>
                    For example, this file imports an aircraft, gear, jump type,
                    location, and one jump:
                </p>
                <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                    <code>{JSONL_EXAMPLE}</code>
                </pre>
                <p>
                    Resource records require <code>type</code>,{" "}
                    <code>name</code>, and <code>previousCount</code>. Jump
                    records require <code>type</code>, <code>jumpNumber</code>,{" "}
                    <code>exitAltitude</code>, <code>openingAltitude</code>,{" "}
                    <code>freefallTime</code>, <code>location</code>, and{" "}
                    <code>aircraft</code>. Descriptions may be omitted or{" "}
                    <code>null</code>, and <code>gear</code> and{" "}
                    <code>jumpTypes</code> may be omitted or empty.
                </p>
                <p>Re-importing a jump with the same jump number updates it.</p>
            </div>
        </Details>
    );
}
