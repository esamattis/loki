const CSV_EXAMPLE = `type,name,previousCount,jumpNumber,jumpDate,exitAltitude,openingAltitude,freefallTime,location,aircraft,gear,jumpTypes,description
aircraft,Twin Otter,120,,,,,,,,,,Fast turbine aircraft
gear,Navigator 260,42,,,,,,,,,,Main canopy
jumpType,Formation skydiving,18,,,,,,,,,,Four-way training
location,Skydive Example,300,,,,,,,,,,Home drop zone
jump,,,301,,4000,1000,55,Skydive Example,Twin Otter,Navigator 260,Formation skydiving,Training jump`;

import { useId } from "hono/jsx";
import { useAppContext } from "@/app/app";
import { ExternalLink } from "@/components/link";
import { Code } from "@/components/ui/code";
import { Details } from "@/components/ui/details";
import { Script } from "@/components/script";
import * as routes from "@/routes";
import { $select } from "@/utils";

/** Inline documentation for downloading the logbook export with curl over Basic auth. */
export function ExportCurlHelp() {
    const csvId = useId();
    const username = useAppContext().getUser().username;
    const csvPath = routes.logbook.transfer.export({});
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
                <Code
                    codeId={csvId}
                    codeProps={{ "data-loki-export-path": csvPath }}
                >
                    {`curl -OJ -u ${username}:<password> '${csvPath}'`}
                </Code>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    The <code>-OJ</code> flags save the file using the name from
                    the response <code>Content-Disposition</code> header (for
                    example <code>loki-your-name-2026-07-13T143022Z.csv</code>).
                    Replace <code>&lt;password&gt;</code> with your account
                    password. Without valid credentials the endpoint responds
                    with HTTP 401.
                </p>
                <Script
                    $deps={[$select]}
                    $args={[csvId, username]}
                    $exec={(csvId, username) => {
                        const origin = window.location.origin;
                        const code = $select.id(csvId, HTMLElement);
                        const exportPath =
                            code.getAttribute("data-loki-export-path") ?? "";
                        code.textContent = `curl -OJ -u ${username}:<password> '${origin}${exportPath}'`;
                    }}
                />
            </div>
        </Details>
    );
}

export function TransferFormatHelp() {
    return (
        <Details
            summary="Loki CSV Format"
            className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300"
            summaryClassName="font-medium text-slate-900 dark:text-slate-100"
        >
            <div className="mt-3 space-y-3">
                <p>
                    Here is an{" "}
                    <ExternalLink href="https://github.com/esamattis/loki/blob/main/src/example-logbook.csv">
                        example export
                    </ExternalLink>{" "}
                    on GitHub.
                </p>
                <p>
                    Export files use CSV with a fixed header. Resource rows
                    appear before jump rows. Jumps refer to gear, locations,
                    aircraft, and jump types by name.
                </p>
                <p>
                    Multiple aircraft, gear, or jump types on one jump are
                    separated by <code>; </code>. A semicolon inside a name is
                    written as <code>;;</code>.
                </p>
                <p>
                    For example, this file imports an aircraft, gear, jump type,
                    location, and one jump:
                </p>
                <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                    <code>{CSV_EXAMPLE}</code>
                </pre>
                <p>
                    Resource rows require <code>type</code>, <code>name</code>,
                    and <code>previousCount</code>. Jump rows require{" "}
                    <code>type</code> and <code>jumpNumber</code>. Other jump
                    fields may be empty. Unknown jump items referenced by name
                    are created automatically.
                </p>
                <p>Re-importing a jump with the same jump number updates it.</p>
            </div>
        </Details>
    );
}
