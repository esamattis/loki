import { eq, getTableColumns, sql } from "drizzle-orm";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import { Button, ButtonLink } from "@/components/form";
import { PlusIcon } from "@/components/icons";
import { IgnoreReturnRoute } from "@/components/return-after-form-post";
import { LogbookPage } from "@/app/logbook-page";
import * as routes from "@/routes";
import { aircrafts, jumpsToAircrafts } from "@/schema";

export function register(app: App) {
    app.get(routes.logbook.aircraft.index.route, getAircraftList);
}

async function getAircraftList(c: AppRequestContext) {
    const app = getAppContext(c);
    const rows = await app.db
        .select({
            ...getTableColumns(aircrafts),
            recordedJumpCount: sql<number>`count(${jumpsToAircrafts.jumpUuid})`,
        })
        .from(aircrafts)
        .leftJoin(
            jumpsToAircrafts,
            eq(aircrafts.uuid, jumpsToAircrafts.aircraftUuid),
        )
        .where(eq(aircrafts.userUuid, app.getUser().uuid))
        .groupBy(aircrafts.uuid)
        .orderBy(aircrafts.name);
    return c.render(
        <LogbookPage title="Aircraft">
            <IgnoreReturnRoute />
            <div className="flex flex-wrap items-center gap-3">
                <ButtonLink
                    href={routes.logbook.aircraft.new({})}
                    icon={<PlusIcon className="h-4 w-4" />}
                    variant="primary"
                    className="gap-1.5"
                >
                    Add aircraft
                </ButtonLink>
            </div>
            {rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        No aircraft yet.
                    </p>
                </div>
            ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {rows.map((aircraft) => (
                        <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-black/30">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                                        {aircraft.name}
                                        {aircraft.archived && (
                                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                Archived
                                            </span>
                                        )}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        Previous jumps:{" "}
                                        {aircraft.previousJumpCount}
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Recorded jumps:{" "}
                                        {aircraft.recordedJumpCount}
                                    </p>
                                    {aircraft.description && (
                                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                            {aircraft.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                                <ButtonLink
                                    href={routes.logbook.aircraft.edit({
                                        uuid: aircraft.uuid,
                                    })}
                                    variant="secondary"
                                    size="sm"
                                >
                                    Edit
                                </ButtonLink>
                                <form
                                    method="post"
                                    action={routes.logbook.aircraft.edit({
                                        uuid: aircraft.uuid,
                                    })}
                                >
                                    <input
                                        type="hidden"
                                        name="action"
                                        value="toggleArchive"
                                    />
                                    <input
                                        type="hidden"
                                        name="archived"
                                        value={String(!aircraft.archived)}
                                    />
                                    <Button
                                        type="submit"
                                        variant="secondary"
                                        size="sm"
                                    >
                                        {aircraft.archived
                                            ? "Unarchive"
                                            : "Archive"}
                                    </Button>
                                </form>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </LogbookPage>,
    );
}
