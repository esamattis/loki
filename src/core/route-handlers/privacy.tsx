import type { Child } from "hono/jsx";
import {
    getRequestContext,
    useRequestContext,
    type AppRouter,
    type HonoRequestContext,
} from "@/core/create-app";
import { AppPage } from "@/core/app-page";
import { isSafeRedirectPath } from "@/core/auth";
import { ErrorList } from "@/core/components/feedback";
import { Button, Checkbox } from "@/core/components/form";
import { RedirectBackAfterPost } from "@/core/components/return-after-form-post";
import { ConfirmDangerButton } from "@/core/components/ui/confirm-danger-button";
import { deleteAccount } from "@/core/delete-account";
import * as routes from "@/core/routes";

/**
 * Renders the unauthenticated privacy policy page.
 *
 * @param props.children - Concrete application privacy policy content.
 */
function PublicPrivacyPage(props: { children: Child }) {
    const context = useRequestContext();
    return (
        <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:py-16">
            <a
                href={routes.auth.login({})}
                className="flex items-center justify-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
            >
                <img
                    src={context.appOptions.logoPath}
                    alt=""
                    aria-hidden="true"
                    className="h-8 w-auto"
                />
                <span>{context.appOptions.title}</span>
            </a>
            <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
                Terms & Privacy Policy
            </h1>
            {props.children}
        </main>
    );
}

/**
 * Renders the required privacy policy acceptance controls.
 *
 * @param props.back - Optional safe return path after acceptance.
 * @param props.error - Optional acceptance validation error.
 */
function PrivacyPolicyDecision(props: { back?: string; error?: string }) {
    return (
        <section className="mt-8 space-y-5 border-t border-slate-200 pt-8 dark:border-slate-800">
            <ErrorList
                errors={props.error ? [props.error] : []}
                className="border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
            />
            <form
                method="post"
                action={routes.privacy(
                    {},
                    props.back ? { back: props.back } : {},
                )}
                className="space-y-4"
            >
                <RedirectBackAfterPost />
                <Checkbox
                    name="accepted"
                    value="true"
                    label="I have read and accept the terms & privacy policy"
                />
                <Button type="submit" variant="primary">
                    Accept terms & privacy policy
                </Button>
            </form>
            <div className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    If you do not accept the terms & privacy policy, you can
                    permanently delete your account and all your data instead.
                </p>
                <form method="post" action={routes.privacy({})}>
                    <ConfirmDangerButton
                        name="action"
                        value="delete"
                        label="Delete account"
                        confirmLabel="Confirm delete"
                    />
                </form>
            </div>
        </section>
    );
}

/** Renders the notice shown while a hosted user must accept the policy. */
function PrivacyPolicyWarning() {
    const context = useRequestContext();
    return (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
            You must accept the terms & privacy policy to continue using{" "}
            {context.appOptions.name}.
        </p>
    );
}

/** Provides the privacy page behavior.
 *
 * @param props.back - Value used to configure back.
 * @param props.error - Value used to configure error.
 */
function PrivacyPage(props: { back?: string; error?: string }) {
    const context = useRequestContext();
    const PrivacyPolicyContent = context.appOptions.privacyPolicyContent;
    if (!PrivacyPolicyContent) {
        throw new Error("Privacy policy content is not configured");
    }
    const user = context.user;
    const mustDecide =
        user !== null &&
        !context.isSelfHosted() &&
        !user.options.privacyPolicyAccepted;
    return user ? (
        <AppPage title="Terms & Privacy Policy">
            {mustDecide && <PrivacyPolicyWarning />}
            <PrivacyPolicyContent />
            {mustDecide && (
                <PrivacyPolicyDecision back={props.back} error={props.error} />
            )}
        </AppPage>
    ) : (
        <PublicPrivacyPage>
            <PrivacyPolicyContent />
        </PublicPrivacyPage>
    );
}

/** Renders the privacy policy page response. */
function render(c: HonoRequestContext) {
    return c.render(<PrivacyPage back={routes.privacy.query(c).back} />);
}

/** Handles privacy policy acknowledgement. */
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

/** Registers the privacy policy routes. */
export function register(app: AppRouter) {
    app.get(routes.privacy, render);
    app.post(routes.privacy, handle);
}
