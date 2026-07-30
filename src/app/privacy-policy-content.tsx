import type { Child } from "hono/jsx";
import { ExternalLink } from "@/core/components/link";
import { REPOSITORY_URL } from "@/app/metadata";

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

export function LokiPrivacyPolicyContent() {
    return (
        <article className="space-y-6 text-base leading-7 text-slate-700 dark:text-slate-300">
            <p>
                This Terms & Privacy Policy applies only to the free hosted
                service at{" "}
                <ExternalLink href="https://loki.hyppykeli.fi">
                    loki.hyppykeli.fi
                </ExternalLink>
                , a best-effort convenience instance of{" "}
                <ExternalLink href={REPOSITORY_URL}>
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
