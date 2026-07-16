import { useId } from "hono/jsx";
import { useAppContext } from "@/app/app";
import { Code } from "@/components/ui/code";
import { Script } from "@/components/script";
import * as routes from "@/routes";
import { $assertElement } from "@/utils";

function $agentInstructions(uploadUrl: string, username: string): string {
    return `<loki-instructions>
Migrate my attached logbook data file to Loki. Inspect the source file, infer its fields, and convert all usable records to a Loki supported UTF-8 CSV import file. You may use python or python3 for the conversion, but use only the Python standard library.

The required CSV header, including its order and capitalization, is:
type,name,previousCount,jumpNumber,jumpDate,exitAltitude,openingAltitude,freefallTime,location,aircraft,gear,jumpTypes,description

Write resource rows before jump rows. Resource row types are aircraft, gear, jumpType, and location. They require name and previousCount; use 0 when no previous count is known. Jump rows require jumpNumber, exitAltitude, openingAltitude, freefallTime, location, and at least one aircraft. jumpDate is optional and must be YYYY-MM-DD when present. gear and jumpTypes may be empty. Counts and altitude/time fields are whole numbers. Descriptions are optional and limited to 2000 characters.

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

If the user did not provide the password or the data file path in the prompt, ask for them.

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
                        instructions below.
                    </p>
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
