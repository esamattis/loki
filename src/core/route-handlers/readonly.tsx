import { registerRoute } from "@/core/register-route";
import {
    getAppContext,
    type App,
    type AppRequestContext,
} from "@/core/create-app";
import { AppPage } from "@/core/app-page";
import { Button } from "@/core/components/form";
import { LockIcon } from "@/core/components/icons";
import * as routes from "@/core/routes";

function ReadonlyPage() {
    return (
        <AppPage title="Read-only account">
            <div className="flex flex-col items-center gap-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                    <LockIcon className="h-8 w-8" />
                </div>
                <p className="max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
                    This account is read-only. You can browse the application,
                    but changes cannot be saved. Log out and create your own
                    account to make changes.
                </p>
                <form method="post" action={routes.auth.logout({})}>
                    <Button type="submit" variant="primary">
                        Log out
                    </Button>
                </form>
            </div>
        </AppPage>
    );
}

function renderReadonly(c: AppRequestContext) {
    const user = getAppContext(c).user;
    if (!user) {
        return c.redirect(routes.auth.login({}));
    }
    if (!user.readonly) {
        return c.redirect(getAppContext(c).appOptions.authenticatedHome);
    }
    return c.render(<ReadonlyPage />);
}

export function register(app: App) {
    registerRoute(app, "get", routes.readonly, renderReadonly);
}
