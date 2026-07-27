import { useAppContext } from "@/core/create-app";
import { useCoreAppUi } from "@/core/core-app-context";
import { MainMenu } from "@/core/main-menu";
import { Script } from "@/core/components/script";
import { ThemeToggle } from "@/core/components/theme-toggle";
import { $select } from "@/core/utils";
import { useId } from "hono/jsx";

function $initMobileHeader(headerId: string) {
    const headerEl = $select.id(headerId, HTMLElement);
    const header = headerEl;
    const smBreakpoint = getComputedStyle(document.documentElement)
        .getPropertyValue("--breakpoint-sm")
        .trim();
    const mobile = window.matchMedia(`(width < ${smBreakpoint})`);
    let previousScrollY = window.scrollY;
    let ticking = false;

    function updateHeader() {
        const scrollY = window.scrollY;
        const scrollingDown = scrollY > previousScrollY;
        header.classList.toggle(
            "-translate-y-full",
            mobile.matches && scrollingDown && scrollY > header.offsetHeight,
        );
        previousScrollY = scrollY;
        ticking = false;
    }

    window.addEventListener(
        "scroll",
        () => {
            if (!ticking) {
                window.requestAnimationFrame(updateHeader);
                ticking = true;
            }
        },
        { passive: true },
    );
    mobile.addEventListener("change", updateHeader);
}

export function AppHeader() {
    const appContext = useAppContext();
    const appUi = useCoreAppUi();
    const user = appContext.getUser();
    const headerId = useId();

    return (
        <>
            <header
                id={headerId}
                className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-md transition-transform duration-200 motion-reduce:transition-none [view-transition-name:app-header] dark:border-slate-800 dark:bg-slate-900/85"
            >
                <div className="mx-auto max-w-3xl px-4 py-2.5 sm:py-3">
                    <div className="flex items-center gap-3">
                        <a
                            href={appContext.appOptions.authenticatedHome}
                            className="flex shrink-0 items-center gap-2 text-base font-bold tracking-tight text-slate-900 sm:text-lg dark:text-slate-100"
                        >
                            <img
                                src={appContext.appOptions.logoPath}
                                alt=""
                                aria-hidden="true"
                                className="h-8 w-auto"
                            />
                            <span className="flex flex-col">
                                <span>{appContext.appOptions.title}</span>
                                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                                    {appUi.authenticatedUserSubtitle(user)}
                                </span>
                            </span>
                        </a>
                        <div className="ml-auto flex shrink-0 items-center gap-2">
                            <ThemeToggle />
                            <div className="hidden sm:block">
                                <MainMenu isAdmin={user.admin} />
                            </div>
                        </div>
                    </div>
                    {appUi.navigation && (
                        <div className="mt-2 hidden border-t border-slate-100 pt-2 sm:block dark:border-slate-800">
                            {appUi.navigation({})}
                        </div>
                    )}
                </div>
            </header>
            <Script
                $deps={[$select]}
                $args={[headerId]}
                $exec={$initMobileHeader}
            />
        </>
    );
}
