import type { Child } from "hono/jsx";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import { Button, ButtonLink, buttonClassName } from "@/components/form";
import { ExternalLink } from "@/components/link";
import { ThemeToggle } from "@/components/theme-toggle";
import {
    GearIcon,
    LocationIcon,
    JumpTypeIcon,
    StatisticsIcon,
    TransferIcon,
} from "@/components/menu-icons";
import { CameraIcon, ClipboardIcon } from "@/components/icons";
import { Code } from "@/components/ui/code";
import * as routes from "@/routes";

const REPOSITORY_URL = "https://github.com/esamattis/loki";
const RELEASES_URL = `${REPOSITORY_URL}/releases`;
const YOUTUBE_EMBED_URL = "https://www.youtube.com/embed/wph46K999hQ";
const INSTALL_COMMAND =
    'bash -c "$(curl -fsSL https://raw.githubusercontent.com/esamattis/loki/main/install.sh)"';
const INSTALL_SCRIPT_URL = `${REPOSITORY_URL}/blob/main/install.sh`;
const EXAMPLE_LOGBOOK_URL = `${REPOSITORY_URL}/blob/main/src/example-logbook.csv`;

const cardClassName =
    "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900";
const sectionHeadingClassName =
    "text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100";
const sectionLeadClassName =
    "mt-3 text-base text-slate-600 dark:text-slate-400";

function FullWidthLandingCard(props: {
    children: Child;
    className: string;
    sectionClassName?: string;
}) {
    return (
        <section className={props.sectionClassName}>
            <div className="mx-auto max-w-5xl px-4">
                <div
                    className={`rounded-3xl border px-5 py-10 text-center sm:px-12 sm:py-12 ${props.className}`}
                >
                    {props.children}
                </div>
            </div>
        </section>
    );
}

function LandingHeader(props: { loggedIn: boolean }) {
    return (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
            <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
                <a
                    href={routes.home.route}
                    className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
                >
                    <img
                        src="/logo.svg"
                        alt=""
                        aria-hidden="true"
                        className="h-8 w-auto"
                    />
                    <span>
                        Loki
                        <span className="hidden sm:inline">
                            {" "}
                            – Skydiving Logbook
                        </span>
                    </span>
                </a>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                    <ThemeToggle />
                    {props.loggedIn ? (
                        <a
                            href={routes.logbook.index({})}
                            className={buttonClassName({
                                variant: "secondary",
                                size: "sm",
                                className: "py-2",
                            })}
                        >
                            Open logbook
                        </a>
                    ) : (
                        <a
                            href={routes.auth.login({})}
                            className={buttonClassName({
                                variant: "secondary",
                                size: "sm",
                                className: "py-2",
                            })}
                        >
                            Log in
                        </a>
                    )}
                </div>
            </div>
        </header>
    );
}

function TryDemoButton() {
    return (
        <form method="post" action={routes.demo.try({})}>
            <Button
                type="submit"
                variant="secondary"
                className="w-full px-6 py-3 text-base sm:w-auto"
            >
                Try demo
            </Button>
        </form>
    );
}

function SignUpOrLogbookButton(props: { loggedIn: boolean }) {
    if (props.loggedIn) {
        return (
            <a
                href={routes.logbook.index({})}
                className={buttonClassName({
                    variant: "secondary",
                    className: "w-full px-6 py-3 text-base sm:w-auto",
                })}
            >
                Open your logbook
            </a>
        );
    }
    return (
        <a
            href={routes.auth.register({})}
            className={buttonClassName({
                variant: "secondary",
                className: "w-full px-6 py-3 text-base sm:w-auto",
            })}
        >
            Sign up with invite
        </a>
    );
}

function DownloadButton() {
    return (
        <a
            href={RELEASES_URL}
            className={buttonClassName({
                variant: "primary",
                className: "w-full px-6 py-3 text-base sm:w-auto",
            })}
        >
            Download
        </a>
    );
}

function LandingActions(props: { loggedIn: boolean; showTryDemo?: boolean }) {
    return (
        <>
            {props.showTryDemo ? <TryDemoButton /> : null}
            <SignUpOrLogbookButton loggedIn={props.loggedIn} />
            <DownloadButton />
        </>
    );
}

function Hero(props: { loggedIn: boolean }) {
    return (
        <section className="mx-auto max-w-5xl px-4 pt-12 text-center sm:pt-24">
            <h1 className="flex items-center justify-center gap-3 text-4xl font-bold tracking-tight text-slate-900 sm:gap-4 sm:text-6xl dark:text-white">
                <img
                    src="/logo.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-14 w-auto sm:h-20"
                />
                Loki
            </h1>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 sm:mt-6 sm:text-sm sm:tracking-[0.2em] dark:text-indigo-400">
                Open source skydiving logbook
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                Your jumps, your gear,
                <br className="hidden sm:block" /> your data.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-400">
                Loki is an open source digital logbook for skydivers. Self-host,
                run it locally on your laptop, or possibly use the invite-only
                hosted version. Export an Excel compatible{" "}
                <ExternalLink href={EXAMPLE_LOGBOOK_URL}>
                    (.csv) backup
                </ExternalLink>{" "}
                whenever you want - your logbook data always stays yours.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <TryDemoButton />
                <SignUpOrLogbookButton loggedIn={props.loggedIn} />
            </div>
            <VideoEmbed />
        </section>
    );
}

function LocalInstallation() {
    return (
        <FullWidthLandingCard
            sectionClassName="mt-8 sm:mt-10"
            className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
            <h2 className={sectionHeadingClassName}>Local Installation</h2>
            <div className="mt-6 flex justify-center">
                <DownloadButton />
            </div>
            <p className="mt-8 text-sm font-medium text-slate-600 dark:text-slate-400">
                Install on Linux or macOS with
            </p>
            <div className="mt-2 w-full min-w-0 max-w-full">
                <Code className="p-4 pr-20 text-left text-xs sm:p-5 sm:pr-24">
                    {INSTALL_COMMAND}
                </Code>
            </div>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Installs to{" "}
                <code className="font-mono text-slate-600 dark:text-slate-300">
                    ~/.local/bin/loki
                </code>{" "}
                (or{" "}
                <code className="font-mono text-slate-600 dark:text-slate-300">
                    /usr/local/bin/loki
                </code>{" "}
                as root).{" "}
                <ExternalLink href={INSTALL_SCRIPT_URL}>
                    View install script
                </ExternalLink>
                . <br />
                On Windows, download loki.exe from the{" "}
                <ExternalLink href={RELEASES_URL}>releases page</ExternalLink>.
            </p>
        </FullWidthLandingCard>
    );
}

function VideoEmbed() {
    return (
        <div className="mx-auto mt-8 max-w-5xl sm:mt-10">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="relative aspect-video w-full">
                    <iframe
                        className="absolute inset-0 h-full w-full"
                        src={YOUTUBE_EMBED_URL}
                        title="Loki product video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowfullscreen
                    />
                </div>
            </div>
            <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
                Quick glance at Loki's features
            </p>
        </div>
    );
}

interface Feature {
    icon: Child;
    title: string;
    description: string;
}

const FEATURES: Feature[] = [
    {
        icon: <ClipboardIcon className="h-6 w-6 text-indigo-500" />,
        title: "Digital logbook",
        description:
            "Capture every jump with exit and opening altitude, freefall time, description, and jump number.",
    },
    {
        icon: <JumpTypeIcon className="h-6 w-6 text-indigo-500" />,
        title: "Customizable jump types",
        description:
            "Create your own jump types and assign multiple types to each jump, such as freefly with load organizer or cutaway.",
    },
    {
        icon: <LocationIcon className="h-6 w-6 text-indigo-500" />,
        title: "Locations, aircraft & gear",
        description:
            "Track drop zones, aircraft, and rigs as reusable jump items. Assign multiple aircraft to a jump to record both the aircraft type and the individual aircraft.",
    },
    {
        icon: <GearIcon className="h-6 w-6 text-indigo-500" />,
        title: "Gear usage tracking",
        description:
            "See how many jumps each canopy, wingsuit or line set has accumulated. Know when it is time to retire or inspect.",
    },
    {
        icon: <StatisticsIcon className="h-6 w-6 text-indigo-500" />,
        title: "Total & yearly statistics",
        description:
            "Review all-time totals and jumps by year. Compare freefall time and distance, plus jump counts by location, aircraft, gear, and jump type.",
    },
    {
        icon: <StatisticsIcon className="h-6 w-6 text-indigo-500" />,
        title: "Record statistics",
        description:
            "Find your longest freefall, altitude and speed records, and the most jumps you have made in a day, week, or month.",
    },
    {
        icon: <CameraIcon className="h-6 w-6 text-indigo-500" />,
        title: "AI vision imports",
        description:
            "Snap a photo of a paper logbook page, altimeter, or audible readout and let AI vision build the jump entry using your own OpenAI API key (BYOK).",
    },
    {
        icon: (
            <span className="font-mono text-lg font-bold text-indigo-500">
                &gt;_
            </span>
        ),
        title: "AI agent imports",
        description:
            "Give an AI coding agent your existing logbook files and Loki's migration instructions. The agent can inspect, combine, convert, validate, and import your jumps automatically.",
    },
    {
        icon: <TransferIcon className="h-6 w-6 text-indigo-500" />,
        title: "CSV import & export",
        description:
            "Bring your existing logbook in via CSV and keep a portable backup. No lock-in — your data is always exportable.",
    },
];

function FeatureCard(props: { feature: Feature }) {
    return (
        <div className={cardClassName}>
            <div className="flex items-center gap-3">
                {props.feature.icon}
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {props.feature.title}
                </h3>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                {props.feature.description}
            </p>
        </div>
    );
}

function Features() {
    return (
        <section className="mx-auto mt-16 max-w-5xl px-4 sm:mt-20">
            <h2 className={sectionHeadingClassName}>
                Built for the way you jump
            </h2>
            <p className={sectionLeadClassName}>
                Everything you need to keep a clean, searchable record of every
                jump — and the gear you trust it with.
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((feature) => (
                    <FeatureCard key={feature.title} feature={feature} />
                ))}
            </div>
        </section>
    );
}

function SelfHosting() {
    return (
        <section className="mx-auto mt-16 max-w-5xl px-4 sm:mt-20">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
                <div>
                    <h2 className={sectionHeadingClassName}>
                        Open source. Self-hosted. Yours.
                    </h2>
                    <p className={sectionLeadClassName}>
                        Loki is licensed under the AGPL and runs anywhere you
                        can run a single binary. Host it on your own server,
                        spin it up in the cloud, or just run it locally on your
                        laptop. Your logbook data never has to leave your
                        machine.
                    </p>
                    <ul className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                        <li className="flex items-start gap-3">
                            <span className="mt-1 h-2 w-2 flex-none rounded-full bg-indigo-500" />
                            <span>
                                Single executable binary for Linux, macOS, and
                                Windows — no runtime to install.
                            </span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="mt-1 h-2 w-2 flex-none rounded-full bg-indigo-500" />
                            <span>
                                No configuration is needed: start the binary and
                                Loki just works.
                            </span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="mt-1 h-2 w-2 flex-none rounded-full bg-indigo-500" />
                            <span>
                                Local SQLite storage with optional CSV backups.
                            </span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="mt-1 h-2 w-2 flex-none rounded-full bg-indigo-500" />
                            <span>
                                Deploy to{" "}
                                <ExternalLink href="https://www.cloudflare.com/products/workers/">
                                    Cloudflare Workers
                                </ExternalLink>{" "}
                                using the free plan
                            </span>
                        </li>
                    </ul>
                    <p className={sectionLeadClassName}>
                        Prefer not to manage it yourself? An invite-only hosted
                        version is also available. Ping Esa-Matti for invite. If
                        you know how to contact me, you might just get one :)
                    </p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        <a
                            href={REPOSITORY_URL}
                            className={buttonClassName({
                                variant: "secondary",
                                size: "sm",
                                className: "w-full sm:w-auto",
                            })}
                        >
                            Source on GitHub
                        </a>
                        <a
                            href={RELEASES_URL}
                            className={buttonClassName({
                                variant: "secondary",
                                size: "sm",
                                className: "w-full sm:w-auto",
                            })}
                        >
                            Binary releases
                        </a>
                        <ButtonLink
                            href={routes.about({})}
                            variant="secondary"
                            size="sm"
                            className="w-full sm:w-auto"
                        >
                            About Loki
                        </ButtonLink>
                    </div>
                </div>
                <div className={cardClassName}>
                    <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-[0.6875rem] leading-5 text-slate-800 sm:p-4 sm:text-xs sm:leading-6 dark:bg-slate-950 dark:text-slate-200">
                        <code>{`# Download the binary for your platform
./loki

# Open the logbook
open http://localhost:8787`}</code>
                    </pre>
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        That's it. Loki boots a local server and stores your
                        logbook in a single SQLite file into your home
                        directory.
                    </p>
                </div>
            </div>
        </section>
    );
}

function FooterCta(props: { loggedIn: boolean }) {
    return (
        <FullWidthLandingCard
            sectionClassName="mt-16 sm:mt-24"
            className="border-indigo-200 bg-indigo-50 dark:border-indigo-900/60 dark:bg-indigo-950/40"
        >
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                Start your digital logbook today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-700 dark:text-slate-300">
                {props.loggedIn
                    ? "Head back to your logbook and keep recording your jumps."
                    : "Use an invitation to create a hosted account, or log in to pick up where you left off."}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <LandingActions loggedIn={props.loggedIn} showTryDemo />
            </div>
        </FullWidthLandingCard>
    );
}

function LandingPage(props: { loggedIn: boolean }) {
    return (
        <div className="min-h-screen">
            <LandingHeader loggedIn={props.loggedIn} />
            <main>
                <Hero loggedIn={props.loggedIn} />
                <LocalInstallation />
                <Features />
                <SelfHosting />
                <FooterCta loggedIn={props.loggedIn} />
            </main>
        </div>
    );
}

function renderHome(c: AppRequestContext) {
    return c.render(<LandingPage loggedIn={Boolean(getAppContext(c).user)} />);
}

export function register(app: App) {
    app.get(routes.home.route, renderHome);
}
