import * as routes from "@/routes";
import clsx from "clsx";

const REPOSITORY_URL = "https://github.com/esamattis/loki";
const linkClassName =
    "underline-offset-2 hover:text-indigo-600 hover:underline dark:hover:text-indigo-400";

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
                        <a
                            href="https://esamatti.fi/"
                            className="font-medium text-slate-700 underline-offset-2 hover:text-indigo-600 hover:underline dark:text-slate-300 dark:hover:text-indigo-400"
                        >
                            Esa-Matti Suuronen
                        </a>
                    </span>
                </div>
                <nav aria-label="Footer" className="flex items-center gap-4">
                    <a href={routes.home({})} className={linkClassName}>
                        Home
                    </a>
                    <a
                        href={routes.about({})}
                        aria-label="Footer about page"
                        className={linkClassName}
                    >
                        About
                    </a>
                    <a
                        href={REPOSITORY_URL}
                        aria-label="Loki source code"
                        className={linkClassName}
                    >
                        GitHub
                    </a>
                </nav>
            </div>
        </footer>
    );
}
