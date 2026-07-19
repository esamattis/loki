import { useAppContext } from "@/app/app";
import { LogbookActions } from "@/app/logbook-actions";
import { MainMenu } from "@/app/main-menu";
import { Script } from "@/components/script";
import { ThemeToggle } from "@/components/theme-toggle";
import * as routes from "@/routes";
import { $select } from "@/utils";
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

export function LogbookHeader() {
    const appContext = useAppContext();
    const user = appContext.getUser();
    const pathname = appContext.url().pathname;
    const headerId = useId();

    return (
        <>
            <header
                id={headerId}
                className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-md transition-transform duration-200 motion-reduce:transition-none [view-transition-name:logbook-header] dark:border-slate-800 dark:bg-slate-900/85"
            >
                <div className="mx-auto max-w-3xl px-4 py-2.5 sm:py-3">
                    <div className="flex items-center gap-3">
                        <a
                            href={routes.logbook.index({})}
                            className="flex shrink-0 items-center gap-2 text-base font-bold tracking-tight text-slate-900 sm:text-lg dark:text-slate-100"
                        >
                            <img
                                src="/logo.svg"
                                alt=""
                                aria-hidden="true"
                                className="h-8 w-auto"
                            />
                            <span className="flex flex-col">
                                <span>Loki – Skydiving Logbook</span>
                                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                                    {user.getDisplayName()}'s logbook
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
                    <div className="mt-2 hidden border-t border-slate-100 pt-2 sm:block dark:border-slate-800">
                        <LogbookActions pathname={pathname} />
                    </div>
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
