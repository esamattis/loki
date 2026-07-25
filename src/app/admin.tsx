import { desc, eq, sql } from "drizzle-orm";
import {
    getAppContext,
    type App,
    type AppRequestContext,
} from "@/core/create-app";
import { AppPage } from "@/core/app-page";
import { users } from "@/core/schema";
import { jumps } from "@/app/schema";
import * as routes from "@/app/routes";

async function render(c: AppRequestContext) {
    const context = getAppContext(c);
    if (!context.getUser().admin) return c.notFound();
    const rows = await context.db
        .select({
            username: users.username,
            jumpCount: sql<number>`count(${jumps.uuid})`,
        })
        .from(users)
        .leftJoin(jumps, eq(users.uuid, jumps.userUuid))
        .groupBy(users.uuid)
        .orderBy(desc(users.createdAt));
    return c.render(
        <AppPage title="Recorded jumps">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                {rows.map((row) => (
                    <p>
                        <strong>{row.username}</strong>: {row.jumpCount}
                    </p>
                ))}
            </div>
        </AppPage>,
    );
}

export function register(app: App) {
    app.get(routes.lokiAdmin.route, render);
}
