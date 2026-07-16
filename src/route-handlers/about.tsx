import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import { LogbookPage } from "@/app/authenticated-page";
import { BuildInfo } from "@/components/build-info";
import * as routes from "@/routes";

const repositoryUrl = "https://github.com/esamattis/loki";
const releasesUrl = `${repositoryUrl}/releases`;
const linkClassName =
    "font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-700 dark:text-indigo-400 dark:decoration-indigo-700 dark:hover:text-indigo-300";

function AboutContent(props: { showBuildInfo: boolean }) {
    return (
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
                    Loki is open source software licensed under the GNU Affero
                    General Public License (AGPL).
                </p>
                <p>
                    The source code is available on{" "}
                    <a href={repositoryUrl} className={linkClassName}>
                        GitHub
                    </a>
                    .
                </p>
                <p>
                    Pre-built releases for self-hosting or running Loki on your
                    own computer are available from the{" "}
                    <a href={releasesUrl} className={linkClassName}>
                        releases page
                    </a>
                    .
                </p>
            </div>
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
    if (!getAppContext(c).user) {
        return c.render(<PublicAboutPage />);
    }
    return c.render(
        <LogbookPage title="About">
            <AboutContent showBuildInfo />
        </LogbookPage>,
    );
}

export function register(app: App) {
    app.get(routes.about.route, renderAboutPage);
}
