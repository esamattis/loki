const JSONL_EXAMPLE = `{"type":"aircraft","name":"Twin Otter","previousCount":120,"description":"Fast turbine aircraft"}
{"type":"gear","name":"Navigator 260","previousCount":42,"description":"Main canopy"}
{"type":"jumpType","name":"Formation skydiving","previousCount":18,"description":"Four-way training"}
{"type":"location","name":"Skydive Example","previousCount":300,"description":"Home drop zone"}
{"type":"jump","jumpNumber":301,"exitAltitude":4000,"openingAltitude":1000,"freefallTime":55,"location":"Skydive Example","aircraft":"Twin Otter","gear":["Navigator 260"],"jumpTypes":["Formation skydiving"],"description":"Training jump"}`;

import { useId } from "hono/jsx";
import { Code, Details } from "../components/ui";
import { Script } from "../components/helpers";
import * as routes from "../routes";
import { $assertElement } from "../utils";

/** Inline documentation for downloading the logbook export with curl over Basic auth. */
export function ExportCurlHelp() {
    const id = useId();
    const exportPath = routes.logbookExport({});
    return (
        <Details
            summary="Download with curl"
            className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
            summaryClassName="font-medium text-slate-900"
        >
            <div className="mt-3 space-y-3">
                <p>
                    The export endpoint also accepts HTTP Basic authentication,
                    so you can download your logbook from the command line with
                    curl. Use your username (or email) and account password:
                </p>
                <Code
                    codeId={id}
                    codeProps={{ "data-export-path": exportPath }}
                >
                    {`curl -OJ -u USERNAME:password ${exportPath}`}
                </Code>
                <p className="text-xs text-slate-500">
                    The <code>-OJ</code> flags save the file using the name from
                    the response <code>Content-Disposition</code> header (
                    <code>jump-logbook.jsonl</code>). Replace{" "}
                    <code>USERNAME</code> and <code>password</code> with your
                    credentials. Without valid credentials the endpoint responds
                    with HTTP 401.
                </p>
                <Script
                    $deps={[$assertElement]}
                    $args={[id]}
                    $exec={(id) => {
                        const code = document.getElementById(id);
                        $assertElement(code, HTMLElement);
                        const exportPath =
                            code.getAttribute("data-export-path") ?? "";
                        const origin = window.location.origin;
                        code.textContent = `curl -OJ -u USERNAME:password ${origin}${exportPath}`;
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
            className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
            summaryClassName="font-medium text-slate-900"
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
