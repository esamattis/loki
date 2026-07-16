import { useId } from "hono/jsx";
import { useAppContext } from "@/app/app";
import { Code } from "@/components/ui/code";
import { Details } from "@/components/ui/details";
import { Script } from "@/components/script";
import * as routes from "@/routes";
import { $assertElement } from "@/utils";

const agentLinkClassName =
    "font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-700 dark:text-indigo-400 dark:decoration-indigo-700 dark:hover:text-indigo-300";
const agents = [
    { name: "Aider", url: "https://aider.chat/" },
    {
        name: "Claude Code",
        url: "https://www.anthropic.com/claude-code",
    },
    { name: "Cline", url: "https://cline.bot/" },
    { name: "OpenAI Codex", url: "https://openai.com/codex/" },
    {
        name: "OpenAI Codex CLI",
        url: "https://learn.chatgpt.com/docs/codex/cli",
    },
    { name: "Command Code", url: "https://commandcode.ai/" },
    { name: "Cursor", url: "https://cursor.com/" },
    {
        name: "Gemini CLI",
        url: "https://github.com/google-gemini/gemini-cli",
    },
    {
        name: "GitHub Copilot CLI",
        url: "https://github.com/features/copilot/cli",
    },
    { name: "OpenCode", url: "https://opencode.ai/" },
    { name: "Pi", url: "https://pi.dev/" },
];

function $agentInstructions(uploadUrl: string, username: string): string {
    return `<loki-instructions>
Migrate my skydiving logbook data file to Loki. Inspect the source file, infer its fields, and convert all usable records to a Loki supported UTF-8 CSV import file. You may use python or python3 for the conversion, but use only the Python standard library.

The required CSV header, including its order and capitalization, is:
type,name,previousCount,jumpNumber,jumpDate,exitAltitude,openingAltitude,freefallTime,location,aircraft,gear,jumpTypes,description

Write resource rows before jump rows. Resource row types are aircraft, gear, jumpType, and location. Every resource row must have non-empty type, name, and previousCount values; use 0 when no previous count is known. Every jump row must have non-empty type and jumpNumber values, with type set to jump. jumpDate, exitAltitude, openingAltitude, freefallTime, location, aircraft, gear, and jumpTypes may be empty. jumpDate must be YYYY-MM-DD when present. Counts, altitudes, and freefallTime must be whole numbers when present. jumpNumber must be positive; previousCount must not be negative. When present, exitAltitude must be positive, and openingAltitude and freefallTime must not be negative. freefallTime is in seconds. Loki stores altitudes in meters, so convert source altitudes in feet or any other unit to meters and round them to the nearest whole meter. Descriptions are optional and limited to 2000 characters.

For aircraft, gear, or jumpTypes containing multiple values, join names with "; ". Escape a semicolon inside a name as ";;" before joining. Keep names consistent because jumps refer to resources by name. Unknown resources referenced by jumps are created automatically. Replace line breaks inside values with spaces because each CSV record must occupy one line. Use csv.DictWriter from the standard library so commas and quotes are escaped correctly.

After creating and checking the CSV, save the following as upload.py. Replace PASSWORD with the Loki password supplied in my prompt, then run it with python3 upload.py <converted.csv> (or python upload.py <converted.csv>). This is a full migration, so reset is true and all existing Loki logbook data will be deleted before importing the CSV.

\`\`\`python
import base64
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

UPLOAD_URL = ${JSON.stringify(uploadUrl)}
USERNAME = ${JSON.stringify(username)}
PASSWORD = "<password supplied in prompt>"

csv_path = Path(sys.argv[1])
body = json.dumps({
    "csv": csv_path.read_text(encoding="utf-8"),
    "reset": True,
}).encode()
credentials = base64.b64encode(f"{USERNAME}:{PASSWORD}".encode()).decode()
request = urllib.request.Request(
    UPLOAD_URL,
    data=body,
    headers={
        "Authorization": f"Basic {credentials}",
        "Content-Type": "application/json",
    },
    method="POST",
)
try:
    with urllib.request.urlopen(request) as response:
        print(json.dumps(json.load(response), indent=2))
except urllib.error.HTTPError as error:
    print(error.read().decode("utf-8"))
    raise
\`\`\`


Run the upload only after validating the converted CSV. Report the returned import statistics. If Loki returns HTTP 400, fix the reported CSV errors and upload it again. Do not use third-party Python packages.

After uploading report the reply statistics.

If the user did not provide the password or the data file path in the prompt, ask for them. If the provided file is a native spreadsheet format such as .xlsx, .xls, .xlsm, .ods, or .numbers, ask the user to provide a .csv or .tsv export instead.

</loki-instructions>
`;
}

/** Guidance that can be pasted into an AI agent to migrate another logbook. */
export function AgentMigrationCard() {
    const codeId = useId();
    const username = useAppContext().getUser().username;
    const uploadPath = routes.logbook.transfer.index({});
    return (
        <section className="rounded-2xl border border-violet-200 bg-white p-6 shadow-sm dark:border-violet-900/60 dark:bg-slate-900">
            <div className="flex items-center gap-3">
                <span
                    aria-hidden="true"
                    className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-violet-100 font-mono text-sm font-bold text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
                >
                    &gt;_
                </span>
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        AI Agent migration
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Migrate from any existing data file with an AI agent.
                        Give the agent your file, Loki password and paste the
                        instructions below. Export native spreadsheet files as
                        CSV or TSV first.
                    </p>
                    <Details
                        summary="Common AI agents"
                        className="mt-2 text-sm text-slate-500 dark:text-slate-400"
                        summaryClassName="font-medium text-slate-700 dark:text-slate-300"
                    >
                        <ul className="mt-2 grid list-disc gap-x-6 gap-y-1 pl-9 sm:grid-cols-2">
                            {agents.map((agent) => (
                                <li>
                                    <a
                                        href={agent.url}
                                        className={agentLinkClassName}
                                    >
                                        {agent.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </Details>
                </div>
            </div>
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <p className="font-semibold">Warning</p>
                <p className="mt-1">
                    An AI agent may destroy your existing logbook data or leak
                    your Loki password. Only use an agent you trust and keep a
                    backup of your logbook.
                </p>
            </div>
            <div className="mt-5 space-y-2">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Instructions for the agent
                </p>
                <Code
                    codeId={codeId}
                    codeProps={{ "data-upload-path": uploadPath }}
                    className="max-h-[32rem] whitespace-pre-wrap"
                >
                    {$agentInstructions(uploadPath, username)}
                </Code>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    The upload script uses your current Loki address and
                    username. Include your password when you give these
                    instructions to the agent.
                </p>
                <Script
                    $deps={[$assertElement, $agentInstructions]}
                    $args={[codeId, username]}
                    $exec={(codeId, username) => {
                        const code = document.getElementById(codeId);
                        $assertElement(code, HTMLElement);
                        const uploadPath =
                            code.getAttribute("data-upload-path") ?? "";
                        code.textContent = $agentInstructions(
                            `${window.location.origin}${uploadPath}`,
                            username,
                        );
                    }}
                />
            </div>
        </section>
    );
}
