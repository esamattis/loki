import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { wranglerBin } from "../../scripts/wrangler-bin";

const execFile = promisify(execFileCallback);
export type D1ExecuteResult = {
    results: Array<Record<string, number | string | null>>;
};

export async function executePlaywrightDb(
    sql: string,
): Promise<D1ExecuteResult[]> {
    const { stdout } = await execFile(process.execPath, [
        wranglerBin(),
        "d1",
        "execute",
        "DB",
        "--local",
        "--persist-to",
        ".playwright/state",
        "--json",
        "--command",
        sql,
    ]);
    return JSON.parse(stdout);
}

export async function queryPlaywrightDb(
    sql: string,
): Promise<Array<Record<string, number | string | null>>> {
    return (await executePlaywrightDb(sql))[0]?.results ?? [];
}
