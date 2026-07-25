import { Button } from "@/components/form";
import { RedirectBackAfterPost } from "@/components/return-after-form-post";
import * as routes from "@/routes";

export function ArchiveToggleForm(props: { archived: boolean }) {
    return (
        <form
            method="post"
            className="mt-6 flex max-w-xl flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
            <RedirectBackAfterPost
                returnRoutePrefix={routes.logbook.statistics.detailed.route}
            />
            <input type="hidden" name="action" value="toggleArchive" />
            <input
                type="hidden"
                name="archived"
                value={String(!props.archived)}
            />
            <p className="min-w-0 flex-1 text-sm text-slate-600 dark:text-slate-400">
                {props.archived
                    ? "This item is archived and hidden from new jump forms."
                    : "Archive to hide this item from new jump forms. Existing jumps keep it."}
            </p>
            <Button type="submit" variant="secondary">
                {props.archived ? "Unarchive" : "Archive"}
            </Button>
        </form>
    );
}
