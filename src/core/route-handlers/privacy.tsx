import { registerRoute } from "@/core/register-route";
import {
    getRequestContext,
    useRequestContext,
    type AppRouter,
    type HonoRequestContext,
} from "@/core/create-app";
import { useCoreLayoutUi } from "@/core/core-layout-context";
import { AppPage } from "@/core/app-page";
import { isSafeRedirectPath } from "@/core/auth";
import { Button, Checkbox } from "@/core/components/form";
import { RedirectBackAfterPost } from "@/core/components/return-after-form-post";
import { ConfirmDangerButton } from "@/core/components/ui/confirm-danger-button";
import { deleteAccount } from "@/core/delete-account";
import * as routes from "@/core/routes";

function PrivacyPage(props: { back?: string; error?: string }) {
    const context = useRequestContext();
    const appUi = useCoreLayoutUi();
    const user = context.user;
    const content = (
        <>
            <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {appUi.privacyPolicyContent}
            </section>
            {user &&
                !context.isSelfHosted() &&
                !user.options.privacyPolicyAccepted && (
                    <>
                        <p>
                            You must accept the terms & privacy policy to
                            continue using {context.appOptions.name}.
                        </p>
                        <form
                            method="post"
                            action={routes.privacy(
                                {},
                                props.back ? { back: props.back } : {},
                            )}
                            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
                        >
                            <RedirectBackAfterPost />
                            {props.error && (
                                <p className="text-red-700">{props.error}</p>
                            )}
                            <Checkbox
                                name="accepted"
                                value="true"
                                label="I accept the terms and privacy policy"
                            />
                            <Button type="submit" variant="primary">
                                Accept terms & privacy policy
                            </Button>
                        </form>
                        <form method="post" action={routes.privacy({})}>
                            <ConfirmDangerButton
                                name="action"
                                value="delete"
                                label="Delete account"
                                confirmLabel="Confirm delete"
                            />
                        </form>
                    </>
                )}
        </>
    );
    return user ? (
        <AppPage title="Terms & Privacy Policy">{content}</AppPage>
    ) : (
        <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
            <h1 className="text-3xl font-bold">Terms & Privacy Policy</h1>
            {content}
        </main>
    );
}

function render(c: HonoRequestContext) {
    return c.render(<PrivacyPage back={routes.privacy.query(c).back} />);
}

async function handle(c: HonoRequestContext) {
    const form = await c.req.formData();
    if (form.get("action") === "delete") {
        await deleteAccount(c);
        return c.redirect(routes.auth.login({}));
    }
    const back = routes.privacy.query(c).back;
    if (form.get("accepted") !== "true")
        return c.render(
            <PrivacyPage
                back={back}
                error="You must check the box to accept the terms & privacy policy."
            />,
        );
    const context = getRequestContext(c);
    await context.getUser().updateCoreOptions({ privacyPolicyAccepted: true });
    return c.redirect(
        back && isSafeRedirectPath(back)
            ? back
            : context.appOptions.authenticatedHome,
    );
}

export function register(app: AppRouter) {
    registerRoute(app, "get", routes.privacy, render);
    registerRoute(app, "post", routes.privacy, handle);
}
