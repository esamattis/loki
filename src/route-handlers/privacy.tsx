import type { Child } from "hono/jsx";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import { LogbookPage } from "@/app/logbook-page";
import { deleteAccount } from "@/delete-account";
import { ErrorList } from "@/components/feedback";
import { Button, Checkbox } from "@/components/form";
import { ExternalLink } from "@/components/link";
import { RedirectBackAfterPost } from "@/components/return-after-form-post";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { isSafeRedirectPath } from "@/auth";
import * as routes from "@/routes";

const repositoryUrl = "https://github.com/esamattis/loki";

function Section(props: { title: string; children: Child }) {
    return (
        <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {props.title}
            </h2>
            {props.children}
        </section>
    );
}

function PrivacyContent() {
    return (
        <article className="space-y-6 text-base leading-7 text-slate-700 dark:text-slate-300">
            <p>
                This Terms & Privacy Policy applies only to the free hosted
                service at{" "}
                <ExternalLink href="https://loki.hyppykeli.fi">
                    loki.hyppykeli.fi
                </ExternalLink>
                , a best-effort convenience instance of{" "}
                <ExternalLink href={repositoryUrl}>
                    open-source Loki
                </ExternalLink>{" "}
                offered out of goodwill. It is not a commercial product. We{" "}
                <strong className="font-bold">
                    do not guarantee any data durability, security, backups, or
                    availability of the service
                </strong>
                . Use it at your own risk; export regularly or self-host if you
                need stronger guarantees.
            </p>

            <Section title="Terms">
                <p>
                    The service is provided free, “as is”, and “as available”,
                    with no warranties and no support contract. Features may
                    change or stop at any time. To the fullest extent permitted
                    by law, the operator accepts no liability for any loss or
                    damage from using—or being unable to use—the service,
                    including lost data, downtime, security incidents, and
                    third-party outages. Where liability cannot be excluded, it
                    is limited to zero for this free service.
                </p>
                <p>
                    You are responsible for backups (regular CSV export), your
                    credentials, content you enter, and any third-party keys or
                    services you connect. Do not treat the hosted instance as
                    your only copy of data.
                </p>
                <p>
                    Operated by{" "}
                    <ExternalLink href="https://esamatti.fi/">
                        Esa-Matti Suuronen
                    </ExternalLink>
                    . Contact via that site. The instance may pause, change, or
                    shut down without notice.
                </p>
            </Section>

            <Section title="Privacy">
                <p>
                    We use your data only to run the logbook. We do not sell
                    data or profile users. We do not run analytics, advertising,
                    or tracking.
                </p>
                <p>We may store:</p>
                <ul className="list-disc space-y-1 pl-6">
                    <li>
                        Account data you provide (username, display name, email,
                        password hash)
                    </li>
                    <li>
                        Logbook content you enter (jumps, gear, locations,
                        aircraft, jump types, images, and related notes)
                    </li>
                    <li>
                        Session data needed for required login state handling
                        (session cookie and server-side session records)
                    </li>
                </ul>
                <p>
                    We do not sell or share your personal data with third
                    parties for their own purposes. Infrastructure providers
                    process data only to run the platform under our
                    instructions.
                </p>
                <p>
                    AI Vision is opt-in and bring-your-own-key (BYOK): if you
                    configure an OpenAI API key and use the feature, images and
                    prompts go to OpenAI under OpenAI’s terms. Other AI
                    providers may be added later. We do not send data to AI
                    providers unless you use this feature; they act under their
                    own terms.
                </p>
            </Section>

            <Section title="Where data is stored">
                <p>
                    The hosted service stores data in Cloudflare D1, a global
                    edge database. The service is operated from the European
                    Union (EU).
                </p>
            </Section>

            <Section title="Retention and rights">
                <p>
                    Data is kept while your account exists and the service runs.
                    You can export your logbook and delete your account in
                    preferences. Accounts or the whole instance may also be
                    removed at any time.
                </p>
                <p>
                    Under applicable EU law (including the GDPR), you may
                    request access, correction, deletion, restriction, or
                    portability of your personal data, and object to certain
                    processing. You may lodge a complaint with your local
                    supervisory authority.
                </p>
            </Section>

            <Section title="Self-hosted instances">
                <p>
                    This document covers only loki.hyppykeli.fi. Other
                    deployments are solely that operator’s responsibility.
                </p>
            </Section>

            <Section title="Acceptance and changes">
                <p>
                    Creating an account or continuing to use the hosted service
                    means you accept this Terms & Privacy Policy. If you do not,
                    delete your account or self-host. We may update this page;
                    continued use after a change accepts the new version.
                </p>
            </Section>

            <p className="text-sm text-slate-500 dark:text-slate-400">
                Last updated: 23 July 2026
            </p>
        </article>
    );
}

function PublicPrivacyPage() {
    return (
        <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:py-16">
            <a
                href={routes.auth.login({})}
                className="flex items-center justify-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
            >
                <img
                    src="/logo.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-8 w-auto"
                />
                <span>Loki – Skydiving Logbook</span>
            </a>
            <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
                Terms & Privacy Policy
            </h1>
            <PrivacyContent />
        </main>
    );
}

function PrivacyPolicyDecision(props: { back?: string; errors?: string[] }) {
    return (
        <section className="mt-8 space-y-5 border-t border-slate-200 pt-8 dark:border-slate-800">
            <ErrorList
                errors={props.errors ?? []}
                className="border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
            />
            <form
                method="post"
                action={routes.privacy({}, { back: props.back })}
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
                    permanently delete your account and all logbook data
                    instead.
                </p>
                <ConfirmDeleteButton label="Delete account" />
            </div>
        </section>
    );
}

function PrivacyPolicyWarning() {
    return (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
            You must accept the terms & privacy policy to continue using Loki.
        </p>
    );
}

function renderPrivacyPage(c: AppRequestContext, errors?: string[]) {
    const appContext = getAppContext(c);
    if (!appContext.user) {
        return c.render(<PublicPrivacyPage />);
    }
    const mustDecide =
        !appContext.isSelfHosted() &&
        !appContext.user.options.privacyPolicyAccepted;
    return c.render(
        <LogbookPage title="Terms & Privacy Policy">
            {mustDecide && <PrivacyPolicyWarning />}
            <PrivacyContent />
            {mustDecide && (
                <PrivacyPolicyDecision
                    back={c.req.query("back")}
                    errors={errors}
                />
            )}
        </LogbookPage>,
    );
}

async function handlePrivacyPage(c: AppRequestContext) {
    const appContext = getAppContext(c);
    const user = appContext.user;
    if (!user || appContext.isSelfHosted()) {
        return c.redirect(routes.privacy({}, {}));
    }

    const formData = await c.req.formData();
    if (formData.get("action") === "delete") {
        await deleteAccount(c);
        return c.redirect(routes.auth.login({}));
    }
    if (formData.get("accepted") !== "true") {
        return renderPrivacyPage(c, [
            "You must check the box to accept the terms & privacy policy.",
        ]);
    }

    await user.updateOptions({
        privacyPolicyAccepted: true,
    });

    const back = c.req.query("back");
    return c.redirect(
        isSafeRedirectPath(back) && back !== routes.privacy.route
            ? back
            : routes.logbook.index({}),
    );
}

export function register(app: App) {
    app.get(routes.privacy.route, (c) => renderPrivacyPage(c));
    app.post(routes.privacy.route, handlePrivacyPage);
}
