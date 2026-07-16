import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import { LogbookPage } from "@/app/authenticated-page";
import { BuildInfo } from "@/components/build-info";
import * as routes from "@/routes";

const repositoryUrl = "https://github.com/esamattis/loki";
const releasesUrl = `${repositoryUrl}/releases`;
const licenseUrl = `${repositoryUrl}/blob/main/LICENSE`;
const linkClassName =
    "font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-700 dark:text-indigo-400 dark:decoration-indigo-700 dark:hover:text-indigo-300";

function AboutContent(props: { showBuildInfo: boolean; sqlitePath?: string }) {
    return (
        <div className="space-y-6">
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {props.showBuildInfo && (
                    <p
                        aria-label="Build information"
                        className="text-sm font-semibold text-slate-500 dark:text-slate-400"
                    >
                        <BuildInfo />
                    </p>
                )}
                <div className="space-y-4 text-slate-700 dark:text-slate-300">
                    <p>
                        Loki is open source software licensed under the{" "}
                        <a href={licenseUrl} className={linkClassName}>
                            GNU Affero General Public License (AGPL)
                        </a>
                        .
                    </p>
                    <div>
                        <p>In plain language, the license:</p>
                        <ul className="mt-2 list-disc space-y-1 pl-6">
                            <li>
                                allows you to use Loki for any purpose, study
                                how it works, and modify it
                            </li>
                            <li>
                                allows you to share original or modified copies
                            </li>
                            <li>
                                requires shared copies and their source code to
                                remain available under the AGPL
                            </li>
                            <li>
                                requires you to offer the source code of your
                                modified version to people who use it over a
                                network
                            </li>
                            <li>
                                requires you to keep the copyright and license
                                notices
                            </li>
                        </ul>
                    </div>
                    <p>
                        The source code is available on{" "}
                        <a href={repositoryUrl} className={linkClassName}>
                            GitHub
                        </a>
                        .
                    </p>
                    <p>
                        Loki is developed by{" "}
                        <a
                            href="https://esamatti.fi/"
                            className={linkClassName}
                        >
                            Esa-Matti Suuronen
                        </a>
                        .
                    </p>
                    <p>
                        Pre-built releases for self-hosting or running Loki on
                        your own computer are available from the{" "}
                        <a href={releasesUrl} className={linkClassName}>
                            releases page
                        </a>
                        .
                    </p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                    <p className="font-semibold">
                        Important: Back up your data
                    </p>
                    <p className="mt-1">
                        Loki is provided as-is, without any warranty. This
                        applies in particular to the hosted version: service
                        availability and the preservation of your data are not
                        guaranteed. Take regular backups of your logbook using
                        the{" "}
                        <a
                            href={routes.logbook.transfer.index({})}
                            className="font-semibold underline underline-offset-2 hover:no-underline"
                        >
                            export page
                        </a>
                        .
                    </p>
                </div>
            </div>
            {props.sqlitePath && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <p className="break-all text-sm text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">SQLite database:</span>{" "}
                        <code>{props.sqlitePath}</code>
                    </p>
                </div>
            )}
        </div>
    );
}

function PublicAboutPage() {
    return (
        <main className="mx-auto min-h-screen max-w-3xl space-y-6 px-4 py-8 sm:py-16">
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
                About
            </h1>
            <AboutContent showBuildInfo={false} />
            <nav className="flex justify-center gap-4 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                <a
                    href={routes.auth.login({})}
                    className="underline-offset-2 hover:underline"
                >
                    Log in
                </a>
                <a
                    href={routes.auth.register({})}
                    className="underline-offset-2 hover:underline"
                >
                    Create account
                </a>
            </nav>
        </main>
    );
}

function renderAboutPage(c: AppRequestContext) {
    const appContext = getAppContext(c);
    if (!appContext.user) {
        return c.render(<PublicAboutPage />);
    }
    return c.render(
        <LogbookPage title="About">
            <AboutContent showBuildInfo sqlitePath={appContext.sqlitePath} />
        </LogbookPage>,
    );
}

export function register(app: App) {
    app.get(routes.about.route, renderAboutPage);
}
