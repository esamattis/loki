import { useAppContext } from "@/app/app";
import { Script } from "@/components/script";
import { Style } from "@/components/style";
import { BuildInfo } from "@/components/build-info";
import { Button, ButtonLink, buttonClassName } from "@/components/form";
import {
    BurgerMenuIcon,
    DarkThemeIcon,
    ImageIcon,
    LightThemeIcon,
    LogbookIcon,
    PlusIcon,
    SystemThemeIcon,
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
    MenuDivider,
    menuItemClassName,
} from "@/components/ui/dropdown-menu";
import * as routes from "@/routes";
import { $assertElement } from "@/utils";
import { useId } from "hono/jsx";

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
            <a
                href={routes.logbook.aircraft.index({})}
                className={menuItemClassName}
            >
                <AircraftIcon className={menuIconClassName} />
                Manage aircraft
            </a>
            <a
                href={routes.logbook.gear.index({})}
                className={menuItemClassName}
            >
                <GearIcon className={menuIconClassName} />
                Manage gear
            </a>
            <a
                href={routes.logbook.jumpTypes.index({})}
                className={menuItemClassName}
            >
                <JumpTypeIcon className={menuIconClassName} />
                Manage jump types
            </a>
            <a
                href={routes.logbook.locations.index({})}
                className={menuItemClassName}
            >
                <LocationIcon className={menuIconClassName} />
                Manage locations
            </a>
            <MenuDivider />
            <a
                href={routes.logbook.statistics.index({})}
                className={menuItemClassName}
            >
                <StatisticsIcon className={menuIconClassName} />
                Statistics
            </a>
            <a
                href={routes.logbook.transfer.index({})}
                className={menuItemClassName}
            >
                <TransferIcon className={menuIconClassName} />
                Import or export
            </a>
            <MenuDivider />
            {props.isAdmin && (
                <a href={routes.admin.index({})} className={menuItemClassName}>
                    <AdminIcon className={menuIconClassName} />
                    Admin
                </a>
            )}
            <a href={routes.preferences({})} className={menuItemClassName}>
                <PreferencesIcon className={menuIconClassName} />
                Preferences
            </a>
            <a href={routes.install({})} className={menuItemClassName}>
                <InstallIcon className={menuIconClassName} />
                Install app
            </a>
            <a href={routes.about({})} className={menuItemClassName}>
                <AboutIcon className={menuIconClassName} />
                About
            </a>
            <form method="post" action={routes.auth.logout({})}>
                <button type="submit" className={menuItemClassName}>
                    <LogoutIcon className={menuIconClassName} />
                    Log out
                </button>
            </form>
        </DropdownMenu>
    );
}

function LogbookActions(props: { pathname: string }) {
    const logbookPath = routes.logbook.index({});
    const newJumpPath = routes.logbook.jumps.new({}, {});
    const fromImagePath = routes.logbook.jumps.fromImage({});

    return (
        <nav className="flex flex-wrap items-center gap-2.5 sm:gap-2">
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
                data-tooltip="Show jump list"
                className="gap-1 rounded-md px-2 py-1.5 text-xs font-medium sm:gap-1.5 sm:rounded-lg sm:px-3.5 sm:py-2 sm:text-sm"
            >
                <span className="hidden sm:inline">Logbook</span>
            </ButtonLink>
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
                data-tooltip="Add jump"
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
                data-tooltip="Create jump from image using AI image recognition"
                className="gap-1 rounded-md px-2 py-1.5 text-xs font-medium sm:gap-1.5 sm:rounded-lg sm:px-3.5 sm:py-2 sm:text-sm"
            >
                <span className="hidden sm:inline">Read image</span>
            </ButtonLink>
        </nav>
    );
}

function $initThemeToggle(ids: {
    buttonId: string;
    lightIconId: string;
    darkIconId: string;
    systemIconId: string;
}) {
    const buttonEl = document.getElementById(ids.buttonId);
    $assertElement(buttonEl, HTMLButtonElement);
    const lightIconEl = document.getElementById(ids.lightIconId);
    $assertElement(lightIconEl, SVGSVGElement);
    const darkIconEl = document.getElementById(ids.darkIconId);
    $assertElement(darkIconEl, SVGSVGElement);
    const systemIconEl = document.getElementById(ids.systemIconId);
    $assertElement(systemIconEl, SVGSVGElement);
    const button = buttonEl;
    const lightIcon = lightIconEl;
    const darkIcon = darkIconEl;
    const systemIcon = systemIconEl;

    function getStoredTheme(): "light" | "dark" | "system" {
        try {
            const value = localStorage.getItem("theme");
            if (value === "light" || value === "dark" || value === "system") {
                return value;
            }
        } catch (error) {
            console.error("Failed to read the stored theme", error);
        }
        return "system";
    }

    function applyTheme(theme: "light" | "dark" | "system") {
        const resolved =
            theme === "system"
                ? window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "dark"
                    : "light"
                : theme;
        document.documentElement.classList.toggle("dark", resolved === "dark");
        document.documentElement.style.colorScheme = resolved;
    }

    const labels = {
        light: "Theme: Light. Click for dark",
        dark: "Theme: Dark. Click for system",
        system: "Theme: System. Click for light",
    } as const;
    const nextTheme = {
        light: "dark",
        dark: "system",
        system: "light",
    } as const;

    function updateUi(theme: "light" | "dark" | "system") {
        lightIcon.classList.toggle("hidden", theme !== "light");
        darkIcon.classList.toggle("hidden", theme !== "dark");
        systemIcon.classList.toggle("hidden", theme !== "system");
        button.setAttribute("aria-label", labels[theme]);
        button.dataset.tooltip = labels[theme];
    }

    function setTheme(theme: "light" | "dark" | "system") {
        try {
            localStorage.setItem("theme", theme);
        } catch (error) {
            console.error("Failed to store the selected theme", error);
        }
        applyTheme(theme);
        updateUi(theme);
    }

    updateUi(getStoredTheme());

    button.addEventListener("click", () => {
        setTheme(nextTheme[getStoredTheme()]);
    });

    window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", () => {
            if (getStoredTheme() === "system") {
                applyTheme("system");
            }
        });
}

function ThemeToggle() {
    const id = useId();
    const lightIconId = `${id}-light`;
    const darkIconId = `${id}-dark`;
    const systemIconId = `${id}-system`;

    return (
        <>
            <Button
                id={id}
                type="button"
                variant="secondary"
                aria-label="Toggle theme"
                data-tooltip="Toggle theme"
                className="px-3 py-2 text-sm"
            >
                <LightThemeIcon id={lightIconId} className="hidden h-4 w-4" />
                <DarkThemeIcon id={darkIconId} className="hidden h-4 w-4" />
                <SystemThemeIcon id={systemIconId} className="h-4 w-4" />
            </Button>
            <Script
                $deps={[$assertElement]}
                $args={[
                    {
                        buttonId: id,
                        lightIconId,
                        darkIconId,
                        systemIconId,
                    },
                ]}
                $exec={$initThemeToggle}
            />
        </>
    );
}

function $initMobileHeader(headerId: string) {
    const headerEl = document.getElementById(headerId);
    $assertElement(headerEl, HTMLElement);
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

export function LogbookPage(props: { title?: string; children: any }) {
    const appContext = useAppContext();
    const user = appContext.getUser();
    const pathname = appContext.url().pathname;
    const headerId = useId();

    return (
        <div className="min-h-screen">
            <Style>
                {`
                    html { scroll-padding-top: 4rem; scroll-padding-bottom: 5rem; }
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
                $deps={[$assertElement]}
                $args={[headerId]}
                $exec={$initMobileHeader}
            />
            <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 pb-24 sm:py-8 sm:pb-8">
                {props.title && (
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
                        {props.title}
                    </h1>
                )}
                {props.children}
            </main>
            <nav
                aria-label="Logbook actions"
                className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden dark:border-slate-800 dark:bg-slate-900/85"
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
    );
}
