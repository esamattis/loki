import type { App, AppRequestContext } from "@/app/app";
import { getAppContext } from "@/app/app";
import { LogbookPage } from "@/app/logbook-page";
import { Button, ButtonLink } from "@/components/form";
import { IgnoreReturnRoute } from "@/components/return-after-form-post";
import * as routes from "@/routes";
import { jumpTypes } from "@/schema";
import { eq } from "drizzle-orm";

export function register(app: App) {
    app.get(routes.logbook.jumpTypes.index.route, getJumpTypeList);
}

async function getJumpTypeList(c: AppRequestContext) {
    const app = getAppContext(c);
    const rows = await app.db
        .select()
        .from(jumpTypes)
        .where(eq(jumpTypes.userUuid, app.getUser().uuid))
        .orderBy(jumpTypes.name);
    return c.render(
        <LogbookPage title="Jump types">
            <IgnoreReturnRoute />
            <div className="flex flex-wrap items-center gap-3">
                <ButtonLink
                    href={routes.logbook.jumpTypes.new({})}
                    variant="primary"
                    className="gap-1.5"
                >
                    Add jump type
                </ButtonLink>
            </div>
            {rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        No jump types yet.
                    </p>
                </div>
            ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {rows.map((item) => (
                        <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-black/30">
                            <div className="min-w-0">
                                <p className="font-semibold text-slate-900 dark:text-slate-100">
                                    {item.name}
                                    {item.archived && (
                                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                            Archived
                                        </span>
                                    )}
                                </p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Previous uses: {item.previousUsageCount}
                                </p>
                                {item.description && (
                                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                        {item.description}
                                    </p>
                                )}
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                                <ButtonLink
                                    href={routes.logbook.jumpTypes.edit({
                                        uuid: item.uuid,
                                    })}
                                    variant="secondary"
                                    size="sm"
                                >
                                    Edit
                                </ButtonLink>
                                <form
                                    method="post"
                                    action={routes.logbook.jumpTypes.edit({
                                        uuid: item.uuid,
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
                                        value={String(!item.archived)}
                                    />
                                    <Button
                                        type="submit"
                                        variant="secondary"
                                        size="sm"
                                    >
                                        {item.archived
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
