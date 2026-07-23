import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import { LogbookPage } from "@/app/logbook-page";
import { ButtonLink } from "@/components/form";
import * as routes from "@/routes";

function ReadonlyPage() {
    return (
        <LogbookPage title="Read-only account">
            <div className="flex flex-col items-center gap-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-2xl dark:bg-amber-950/60">
                    🔒
                </div>
                <p className="max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
                    This account is read-only. You can browse the logbook, but
                    changes cannot be saved. Sign up for your own account to
                    start logging jumps.
                </p>
                <div className="flex flex-col items-center gap-3 sm:flex-row">
                    <ButtonLink
                        href={routes.logbook.index({})}
                        variant="primary"
                    >
                        Back to logbook
                    </ButtonLink>
                    <ButtonLink
                        href={routes.auth.register({})}
                        variant="secondary"
                    >
                        Create account
                    </ButtonLink>
                </div>
            </div>
        </LogbookPage>
    );
}

function renderReadonly(c: AppRequestContext) {
    const user = getAppContext(c).user;
    if (!user) {
        return c.redirect(routes.auth.login({}));
    }
    if (!user.readonly) {
        return c.redirect(routes.logbook.index({}));
    }
    return c.render(<ReadonlyPage />);
}

export function register(app: App) {
    app.get(routes.readonly.route, renderReadonly);
}
