import { ExternalLink, Link } from "@/components/link";
import * as routes from "@/routes";
import clsx from "clsx";

const REPOSITORY_URL = "https://github.com/esamattis/loki";

export function Footer(props: { hasBottomNavigation: boolean }) {
    return (
        <footer
            className={clsx(
                "mt-16 border-t border-slate-200 dark:border-slate-800",
                props.hasBottomNavigation && "mb-16 sm:mb-0",
            )}
        >
            <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row dark:text-slate-400">
                <div className="flex flex-col items-center gap-1 text-center sm:flex-row sm:items-center sm:text-left">
                    <div className="flex items-center gap-2">
                        <img
                            src="/logo.svg"
                            alt=""
                            aria-hidden="true"
                            className="h-6 w-auto"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Loki
                        </span>
                        <span>- Skydiving Logbook</span>
                    </div>
                    <span className="hidden text-slate-300 sm:inline dark:text-slate-600">
                        &middot;
                    </span>
                    <span>
                        Built by{" "}
                        <ExternalLink href="https://esamatti.fi/">
                            Esa-Matti Suuronen
                        </ExternalLink>
                    </span>
                </div>
                <nav aria-label="Footer" className="flex items-center gap-4">
                    <Link href={routes.home({})}>Home</Link>
                    <Link
                        href={routes.about({})}
                        aria-label="Footer about page"
                    >
                        About
                    </Link>
                    <ExternalLink
                        href={REPOSITORY_URL}
                        aria-label="Loki source code"
                    >
                        GitHub
                    </ExternalLink>
                </nav>
            </div>
        </footer>
    );
}
