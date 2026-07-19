import { useAppContext } from "@/app/app";
import { Script } from "@/components/script";
import { Style } from "@/components/style";
import { BuildInfo } from "@/components/build-info";
import { ButtonLink, buttonClassName } from "@/components/form";
import { ThemeToggle } from "@/components/theme-toggle";
import {
    BurgerMenuIcon,
    ImageIcon,
    LogbookIcon,
    PlusIcon,
} from "@/components/icons";
import {
    AdminIcon,
    AboutIcon,
    AircraftIcon,
    GearIcon,
    InstallIcon,
    JumpTypeIcon,
    LocationIcon,
    LogoutIcon,
    PreferencesIcon,
    StatisticsIcon,
    TransferIcon,
} from "@/components/menu-icons";
import {
    DropdownMenu,
    MenuButton,
    MenuDivider,
    MenuLink,
} from "@/components/ui/dropdown-menu";
import * as routes from "@/routes";
import { $select } from "@/utils";
import clsx from "clsx";
import { useId, type Child } from "hono/jsx";

const menuIconClassName =
    "h-4 w-4 flex-none text-slate-400 dark:text-slate-500";

function MainMenu(props: { isAdmin: boolean; menuClassName?: string }) {
    return (
        <DropdownMenu
            label="Menu"
            button={<BurgerMenuIcon className="h-5 w-5" />}
            buttonClassName={buttonClassName({
                variant: "secondary",
                className: "px-3 py-2",
            })}
            menuClassName={props.menuClassName}
        >
            <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <BuildInfo />
            </div>
            <MenuDivider />
            <MenuLink href={routes.logbook.aircraft.index({})}>
                <AircraftIcon className={menuIconClassName} />
                Manage aircraft
            </MenuLink>
            <MenuLink href={routes.logbook.gear.index({})}>
                <GearIcon className={menuIconClassName} />
                Manage gear
            </MenuLink>
            <MenuLink href={routes.logbook.jumpTypes.index({})}>
                <JumpTypeIcon className={menuIconClassName} />
                Manage jump types
            </MenuLink>
            <MenuLink href={routes.logbook.locations.index({})}>
                <LocationIcon className={menuIconClassName} />
                Manage locations
            </MenuLink>
            <MenuDivider />
            <MenuLink href={routes.logbook.transfer.index({})}>
                <TransferIcon className={menuIconClassName} />
                Import or export
            </MenuLink>
            <MenuDivider />
            {props.isAdmin && (
                <MenuLink href={routes.admin.index({})}>
                    <AdminIcon className={menuIconClassName} />
                    Admin
                </MenuLink>
            )}
            <MenuLink href={routes.preferences({})}>
                <PreferencesIcon className={menuIconClassName} />
                Preferences
            </MenuLink>
            <MenuLink href={routes.install({})}>
                <InstallIcon className={menuIconClassName} />
                Install app
            </MenuLink>
            <MenuLink href={routes.about({})}>
                <AboutIcon className={menuIconClassName} />
                About
            </MenuLink>
            <MenuDivider />
            <form method="post" action={routes.auth.logout({})}>
                <MenuButton type="submit">
                    <LogoutIcon className={menuIconClassName} />
                    Log out
                </MenuButton>
            </form>
        </DropdownMenu>
    );
}

function LogbookActions(props: { pathname: string }) {
    const logbookPath = routes.logbook.index({});
    const statisticsPath = routes.logbook.statistics.index({});
    const newJumpPath = routes.logbook.jumps.new({}, {});
    const fromImagePath = routes.logbook.jumps.fromImage({});

    return (
        <nav className="flex flex-wrap items-center justify-around sm:justify-start sm:gap-2">
            <ButtonLink
                href={logbookPath}
                icon={<LogbookIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                variant={
                    props.pathname === logbookPath ? "primary" : "secondary"
                }
                aria-label="Logbook"
                aria-current={
                    props.pathname === logbookPath ? "page" : undefined
                }
                data-loki-tooltip="Show jump list"
                className="gap-1 rounded-md px-2 py-1.5 text-xs font-medium sm:gap-1.5 sm:rounded-lg sm:px-3.5 sm:py-2 sm:text-sm"
            >
                <span className="hidden sm:inline">Logbook</span>
            </ButtonLink>
            <ButtonLink
                href={statisticsPath}
                icon={<StatisticsIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                variant={
                    props.pathname.startsWith(statisticsPath)
                        ? "primary"
                        : "secondary"
                }
                aria-label="Statistics"
                aria-current={
                    props.pathname.startsWith(statisticsPath)
                        ? "page"
                        : undefined
                }
                data-loki-tooltip="Show statistics"
                className="gap-1 rounded-md px-2 py-1.5 text-xs font-medium sm:gap-1.5 sm:rounded-lg sm:px-3.5 sm:py-2 sm:text-sm"
            >
                <span className="hidden sm:inline">Statistics</span>
            </ButtonLink>
            <span
                aria-hidden="true"
                className="mx-0.5 h-6 w-px flex-none bg-slate-200 dark:bg-slate-700"
            />
            <ButtonLink
                href={newJumpPath}
                icon={<PlusIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                variant={
                    props.pathname === newJumpPath ? "primary" : "secondary"
                }
                aria-label="Add jump"
                aria-current={
                    props.pathname === newJumpPath ? "page" : undefined
                }
                data-loki-tooltip="Add jump"
                className="gap-1 rounded-md px-2 py-1.5 text-xs font-medium sm:gap-1.5 sm:rounded-lg sm:px-3.5 sm:py-2 sm:text-sm"
            >
                <span className="hidden sm:inline">Add jump</span>
            </ButtonLink>
            <ButtonLink
                href={fromImagePath}
                icon={<ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                variant={
                    props.pathname === fromImagePath ? "primary" : "secondary"
                }
                aria-label="Read image"
                aria-current={
                    props.pathname === fromImagePath ? "page" : undefined
                }
                data-loki-tooltip="AI Vision"
                className="gap-1 rounded-md px-2 py-1.5 text-xs font-medium sm:gap-1.5 sm:rounded-lg sm:px-3.5 sm:py-2 sm:text-sm"
            >
                <span className="hidden sm:inline">Read image</span>
            </ButtonLink>
        </nav>
    );
}

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

export function LogbookPage(props: {
    title?: string;
    mobileAction?: Child;
    children: any;
}) {
    const appContext = useAppContext();
    const user = appContext.getUser();
    const pathname = appContext.url().pathname;
    const headerId = useId();

    return (
        <div>
            <Style>
                {`
                    html { scroll-padding-top: 4rem; scroll-padding-bottom: ${props.mobileAction ? "9rem" : "5rem"}; }
                    @media (min-width: 640px) {
                        html { scroll-padding-top: 8rem; scroll-padding-bottom: 0; }
                    }
                    summary { list-style: none; }
                    summary::-webkit-details-marker { display: none; }
                `}
            </Style>
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
            <main
                className={clsx(
                    "mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-8 sm:pb-8",
                    props.mobileAction ? "pb-40" : "pb-24",
                )}
            >
                {props.title && (
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
                        {props.title}
                    </h1>
                )}
                {props.children}
            </main>
            <div className="fixed bottom-0 left-0 right-0 z-30 sm:hidden">
                {props.mobileAction && (
                    <div
                        aria-label="Form actions"
                        className="border-t border-slate-200 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85"
                    >
                        <div className="mx-auto max-w-3xl px-4 py-2">
                            {props.mobileAction}
                        </div>
                    </div>
                )}
                <nav
                    aria-label="Logbook actions"
                    className="border-t border-slate-200 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85"
                >
                    <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2">
                        <div className="min-w-0 flex-1">
                            <LogbookActions pathname={pathname} />
                        </div>
                        <MainMenu
                            isAdmin={user.admin}
                            menuClassName="bottom-full mb-2 max-h-[calc(100dvh-5rem)] overflow-y-auto"
                        />
                    </div>
                </nav>
            </div>
        </div>
    );
}
