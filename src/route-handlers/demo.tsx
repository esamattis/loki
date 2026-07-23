import { count, eq } from "drizzle-orm";
import {
    getAppContext,
    setAuthenticatedUser,
    type App,
    type AppRequestContext,
} from "@/app/app";
import { generateSessionToken, hashPassword } from "@/auth";
import { UserOptionsSchema, parseUserOptions } from "@/options";
import {
    importRecords,
    parseCsvImport,
} from "@/route-handlers/logbook/transfer/index";
import { createSession } from "@/route-handlers/auth/sessions";
import * as routes from "@/routes";
import { jumps, users } from "@/schema";
import exampleLogbookCsv from "@/example-logbook.csv?raw";

const DEMO_USERNAME = "demo";
const DEMO_EMAIL = "demo@loki.local";
const DEMO_DISPLAY_NAME = "Demo";

async function ensureDemoUser(c: AppRequestContext) {
    const ctx = getAppContext(c);
    const existing = await ctx.db
        .select({
            uuid: users.uuid,
            username: users.username,
            displayName: users.displayName,
            email: users.email,
            options: users.options,
            admin: users.admin,
            htmlCacheGeneration: users.htmlCacheGeneration,
        })
        .from(users)
        .where(eq(users.username, DEMO_USERNAME))
        .limit(1)
        .get();

    if (existing) {
        const options = parseUserOptions(existing.options);
        if (!options.readonly) {
            const nextOptions = UserOptionsSchema.parse({
                ...options,
                readonly: true,
            });
            await ctx.db
                .update(users)
                .set({ options: JSON.stringify(nextOptions) })
                .where(eq(users.uuid, existing.uuid))
                .run();
            return {
                ...existing,
                options: JSON.stringify(nextOptions),
            };
        }
        return existing;
    }

    const uuid = crypto.randomUUID();
    const options = UserOptionsSchema.parse({ readonly: true });
    const optionsJson = JSON.stringify(options);
    await ctx.db
        .insert(users)
        .values({
            uuid,
            username: DEMO_USERNAME,
            displayName: DEMO_DISPLAY_NAME,
            email: DEMO_EMAIL,
            password: await hashPassword(generateSessionToken()),
            options: optionsJson,
            admin: false,
        })
        .run();

    return {
        uuid,
        username: DEMO_USERNAME,
        displayName: DEMO_DISPLAY_NAME,
        email: DEMO_EMAIL,
        options: optionsJson,
        admin: false,
        htmlCacheGeneration: 0,
    };
}

async function ensureDemoExampleData(c: AppRequestContext, userUuid: string) {
    const ctx = getAppContext(c);
    const [jumpCountRow] = await ctx.db
        .select({ value: count() })
        .from(jumps)
        .where(eq(jumps.userUuid, userUuid));
    if ((jumpCountRow?.value ?? 0) > 0) {
        return;
    }

    const importResult = parseCsvImport(exampleLogbookCsv);
    if ("errors" in importResult) {
        console.error("Example logbook CSV is invalid", importResult.errors);
        throw new Error("Example logbook data is invalid.");
    }

    await importRecords(c, importResult.records, true);
}

async function handleTryDemo(c: AppRequestContext) {
    const demoUser = await ensureDemoUser(c);
    setAuthenticatedUser(getAppContext(c), demoUser);
    await ensureDemoExampleData(c, demoUser.uuid);
    await createSession(c, demoUser.uuid);
    return c.redirect(routes.logbook.index({}));
}

export function register(app: App) {
    app.post(routes.demo.try.route, handleTryDemo);
}
