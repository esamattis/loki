import { useAppContext } from "@/app";
import { Script } from "@/components/script";
import { Style } from "@/components/style";
import { Button, ButtonLink, buttonClassName } from "@/components/form";
import {
    DropdownMenu,
    MenuDivider,
    menuItemClassName,
} from "@/components/ui/dropdown-menu";
import * as routes from "@/routes";
import { $assertElement } from "@/utils";
import { useId } from "hono/jsx";

function BurgerMenuIcon() {
    return (
        <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
            />
        </svg>
    );
}

function MainMenu(props: { isAdmin: boolean; menuClassName?: string }) {
    return (
        <DropdownMenu
            label="Menu"
            tooltip="Menu"
            button={<BurgerMenuIcon />}
            buttonClassName={buttonClassName({
                variant: "secondary",
                className: "px-3 py-2",
            })}
            menuClassName={props.menuClassName}
        >
            <a href={routes.aircraftList({})} className={menuItemClassName}>
                Manage aircraft
            </a>
            <a href={routes.gearList({})} className={menuItemClassName}>
                Manage gear
            </a>
            <a href={routes.jumpTypeList({})} className={menuItemClassName}>
                Manage jump types
            </a>
            <a href={routes.locationList({})} className={menuItemClassName}>
                Manage locations
            </a>
            <MenuDivider />
            <a
                href={routes.logbookStatistics({})}
                className={menuItemClassName}
            >
                Statistics
            </a>
            <a href={routes.logbookTransfer({})} className={menuItemClassName}>
                Import or export
            </a>
            <MenuDivider />
            {props.isAdmin && (
                <a href={routes.admin({})} className={menuItemClassName}>
                    Admin
                </a>
            )}
            <a href={routes.preferences({})} className={menuItemClassName}>
                Preferences
            </a>
            <form method="post" action={routes.logout({})}>
                <button type="submit" className={menuItemClassName}>
                    Log out
                </button>
            </form>
        </DropdownMenu>
    );
}

function PlusIcon() {
    return (
        <svg
            aria-hidden="true"
            className="h-3.5 w-3.5 sm:h-4 sm:w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2.5"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 4v16m8-8H4"
            />
        </svg>
    );
}

function LogbookIcon() {
    return (
        <svg
            aria-hidden="true"
            className="h-3.5 w-3.5 sm:h-4 sm:w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 6h16M4 12h10M4 18h14"
            />
        </svg>
    );
}

function ImageIcon() {
    return (
        <svg
            aria-hidden="true"
            className="h-3.5 w-3.5 sm:h-4 sm:w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
        </svg>
    );
}

function LogbookActions() {
    return (
        <nav className="flex flex-wrap items-center gap-2.5 sm:gap-2">
            <ButtonLink
                href={routes.logbook({})}
                variant="secondary"
                aria-label="Logbook"
                data-tooltip="Show jump list"
                className="gap-1 rounded-md px-2 py-1.5 text-xs font-medium sm:gap-1.5 sm:rounded-lg sm:px-3.5 sm:py-2 sm:text-sm"
            >
                <LogbookIcon />
                <span className="hidden sm:inline">Logbook</span>
            </ButtonLink>
            <ButtonLink
                href={routes.jumpNew({}, {})}
                variant="primary"
                aria-label="Add jump"
                data-tooltip="Add jump"
                className="gap-1 rounded-md px-2 py-1.5 text-xs font-medium sm:gap-1.5 sm:rounded-lg sm:px-3.5 sm:py-2 sm:text-sm"
            >
                <PlusIcon />
                <span className="hidden sm:inline">Add jump</span>
            </ButtonLink>
            <ButtonLink
                href={routes.jumpFromImage({})}
                variant="secondary"
                aria-label="From image"
                data-tooltip="Create jump from image using AI image recognition"
                className="gap-1 rounded-md px-2 py-1.5 text-xs font-medium sm:gap-1.5 sm:rounded-lg sm:px-3.5 sm:py-2 sm:text-sm"
            >
                <ImageIcon />
                <span className="hidden sm:inline">From image</span>
            </ButtonLink>
        </nav>
    );
}

function ThemeIcon(props: { id: string; className: string; path: string }) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d={props.path}
            />
        </svg>
    );
}

function $initThemeToggle(
    buttonId: string,
    lightIconId: string,
    darkIconId: string,
    systemIconId: string,
) {
    const buttonEl = document.getElementById(buttonId);
    $assertElement(buttonEl, HTMLButtonElement);
    const lightIconEl = document.getElementById(lightIconId);
    $assertElement(lightIconEl, SVGSVGElement);
    const darkIconEl = document.getElementById(darkIconId);
    $assertElement(darkIconEl, SVGSVGElement);
    const systemIconEl = document.getElementById(systemIconId);
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
        } catch {
            // ignore
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
        } catch {
            // ignore
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
                <ThemeIcon
                    id={lightIconId}
                    className="hidden h-4 w-4"
                    path="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0l-1.414-1.414M7.05 7.05 5.636 5.636M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
                <ThemeIcon
                    id={darkIconId}
                    className="hidden h-4 w-4"
                    path="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
                />
                <ThemeIcon
                    id={systemIconId}
                    className="h-4 w-4"
                    path="M9.75 17h4.5m-8.25 2h12a1.5 1.5 0 001.5-1.5v-11A1.5 1.5 0 0018 5H6a1.5 1.5 0 00-1.5 1.5v11A1.5 1.5 0 006 19z"
                />
            </Button>
            <Script
                $deps={[$assertElement]}
                $args={[id, lightIconId, darkIconId, systemIconId]}
                $exec={$initThemeToggle}
            />
        </>
    );
}

export function LogbookPage(props: { title: string; children: any }) {
    const user = useAppContext().getUser();

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
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
                <div className="mx-auto max-w-3xl px-4 py-2.5 sm:py-3">
                    <div className="flex items-center gap-3">
                        <a
                            href={routes.logbook({})}
                            data-tooltip="Logbook home"
                            className="flex shrink-0 items-center gap-2 text-base font-bold tracking-tight text-slate-900 sm:text-lg dark:text-slate-100"
                        >
                            <img
                                src="/logo.svg"
                                alt=""
                                aria-hidden="true"
                                className="h-8 w-auto"
                            />
                            <span className="inline">
                                {user.getDisplayName()}'s logbook
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
                        <LogbookActions />
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 pb-24 sm:py-8 sm:pb-8">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
                    {props.title}
                </h1>
                {props.children}
            </main>
            <nav
                aria-label="Logbook actions"
                className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden dark:border-slate-800 dark:bg-slate-900/85"
            >
                <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2">
                    <div className="min-w-0 flex-1">
                        <LogbookActions />
                    </div>
                    <MainMenu
                        isAdmin={user.admin}
                        menuClassName="bottom-full mb-2"
                    />
                </div>
            </nav>
        </div>
    );
}
