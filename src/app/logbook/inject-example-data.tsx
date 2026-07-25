import { count, eq } from "drizzle-orm";
import {
    getAppContext,
    type App,
    type AppRequestContext,
} from "@/core/create-app";
import * as routes from "@/app/routes";
import { jumps } from "@/app/schema";
import { importRecords, parseCsvImport } from "@/app/logbook/transfer/index";
import exampleLogbookCsv from "@/app/example-logbook.csv?raw";

export async function handleInjectExampleData(c: AppRequestContext) {
    const context = getAppContext(c);
    const userUuid = context.getUser().uuid;
    const [jumpCountRow] = await context.db
        .select({ value: count() })
        .from(jumps)
        .where(eq(jumps.userUuid, userUuid));
    if ((jumpCountRow?.value ?? 0) > 0) {
        return c.text(
            "Example data can only be loaded when the logbook has no jumps.",
            400,
        );
    }

    const importResult = parseCsvImport(exampleLogbookCsv);
    if ("errors" in importResult) {
        console.error("Example logbook CSV is invalid", importResult.errors);
        return c.text("Example logbook data is invalid.", 500);
    }

    try {
        await importRecords(c, importResult.records, true);
    } catch (error) {
        console.error("Failed to inject example logbook data", error);
        return c.text(
            error instanceof Error
                ? error.message
                : "Could not load example data.",
            400,
        );
    }

    return c.redirect(routes.logbook.index({}));
}

export function register(app: App) {
    app.post(routes.logbook.injectExampleData.route, handleInjectExampleData);
}
