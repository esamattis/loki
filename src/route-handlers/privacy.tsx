import type { Child } from "hono/jsx";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import { LogbookPage } from "@/app/logbook-page";
import { ExternalLink } from "@/components/link";
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
                This privacy policy applies only to the hosted service at{" "}
                <ExternalLink href="https://loki.hyppykeli.fi">
                    loki.hyppykeli.fi
                </ExternalLink>
                . In short: we do not use your data for anything beyond running
                the logbook, and we do not share it with anyone.
            </p>
            <p>
                Loki is{" "}
                <ExternalLink href={repositoryUrl}>open source</ExternalLink>,
                so you can inspect how the software handles data.
            </p>

            <Section title="Data controller">
                <p>
                    The service is operated by{" "}
                    <ExternalLink href="https://esamatti.fi/">
                        Esa-Matti Suuronen
                    </ExternalLink>
                    . Contact via the details on that site.
                </p>
            </Section>

            <Section title="What we collect">
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
                        Technical session data needed to keep you signed in
                        (session cookie and server-side session records)
                    </li>
                </ul>
                <p>
                    We do not run analytics, advertising, or any form of user
                    tracking.
                </p>
            </Section>

            <Section title="Why we process data">
                <p>
                    We process your data only to provide and maintain the
                    logbook service you signed up for (contract / legitimate
                    interest in operating the service). We do not sell data,
                    profile users, or use logbook content for marketing or
                    training.
                </p>
            </Section>

            <Section title="Sharing">
                <p>
                    We do not sell or share your personal data with third
                    parties for their own purposes. Infrastructure providers
                    that host the service may process data solely to run the
                    platform under our instructions.
                </p>
                <p>
                    Optional AI Vision is opt-in and bring-your-own-key (BYOK):
                    if you configure an OpenAI API key and use the feature,
                    images and related prompts you submit are sent to OpenAI
                    under OpenAI’s terms. The service may support other AI
                    providers in the future at the operator’s choice. We do not
                    send data to AI providers unless you use this feature.
                </p>
            </Section>

            <Section title="Where data is stored">
                <p>
                    The hosted service stores data in Cloudflare D1, a global
                    edge database. The service is operated from the European
                    Union (EU).
                </p>
            </Section>

            <Section title="Retention">
                <p>
                    Account and logbook data are kept while your account exists.
                    You can delete your account in preferences, which removes
                    your data from the service.
                </p>
            </Section>

            <Section title="Data durability">
                <p>
                    We do not guarantee that your data will be stored
                    indefinitely. The service may disappear any time for any
                    reason. You should export your logbook regularly as a CSV
                    backup. If you need stronger control, you can also self-host
                    Loki on your own infrastructure.
                </p>
            </Section>

            <Section title="Your rights">
                <p>
                    Under applicable EU data protection law (including the
                    GDPR), you may request access, correction, deletion,
                    restriction, or portability of your personal data, and you
                    may object to certain processing. You can export your
                    logbook from the app and delete your account yourself. You
                    may also lodge a complaint with your local supervisory
                    authority.
                </p>
            </Section>

            <Section title="Cookies">
                <p>
                    Cookies are used only for required login state handling: a
                    session cookie keeps you signed in. We do not set cookies
                    for analytics, advertising, or tracking.
                </p>
            </Section>

            <Section title="Self-hosted instances">
                <p>
                    This policy applies only to loki.hyppykeli.fi. If you run
                    Loki yourself or use another deployment, that operator is
                    responsible for its privacy practices.
                </p>
            </Section>

            <Section title="Changes">
                <p>
                    We may update this policy from time to time. The current
                    version is always available on this page.
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
                Privacy Policy
            </h1>
            <PrivacyContent />
        </main>
    );
}

function renderPrivacyPage(c: AppRequestContext) {
    const appContext = getAppContext(c);
    if (!appContext.user) {
        return c.render(<PublicPrivacyPage />);
    }
    return c.render(
        <LogbookPage title="Privacy Policy">
            <PrivacyContent />
        </LogbookPage>,
    );
}

export function register(app: App) {
    app.get(routes.privacy.route, renderPrivacyPage);
}
