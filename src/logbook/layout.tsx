import { useAppContext } from "../app";
import { Script, Style } from "../components/helpers";
import { DropdownMenu, MenuDivider, menuItemClassName } from "../components/ui";
import * as routes from "../routes";
import { $assertElement } from "../utils";
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

function MainMenu(props: { isAdmin: boolean }) {
    return (
        <DropdownMenu
            label="Menu"
            button={<BurgerMenuIcon />}
            buttonClassName="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-indigo-400/40"
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

function LogbookActions() {
    return (
        <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <a
                href={routes.jumpNew({}, {})}
                className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 sm:gap-1.5 sm:rounded-lg sm:px-3.5 sm:py-2 sm:text-sm dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus:ring-indigo-400/40"
            >
                <PlusIcon />
                Add jump
            </a>
            <a
                href={routes.jumpFromImage({})}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 sm:gap-1.5 sm:rounded-lg sm:px-3.5 sm:py-2 sm:text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-indigo-400/40"
            >
                <PlusIcon />
                From image
            </a>
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
    if (
        !(buttonEl instanceof HTMLButtonElement) ||
        !(lightIconEl instanceof SVGSVGElement) ||
        !(darkIconEl instanceof SVGSVGElement) ||
        !(systemIconEl instanceof SVGSVGElement)
    ) {
        return;
    }
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
        button.title = labels[theme];
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
            <button
                id={id}
                type="button"
                aria-label="Toggle theme"
                title="Toggle theme"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-indigo-400/40"
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
            </button>
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
                    html { scroll-padding-top: 8rem; }
                    summary { list-style: none; }
                    summary::-webkit-details-marker { display: none; }
                `}
            </Style>
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
                <div className="mx-auto max-w-3xl px-4 py-2.5 sm:py-3">
                    <div className="flex items-center gap-3">
                        <a
                            href={routes.logbook({})}
                            className="flex shrink-0 items-center gap-2 text-base font-bold tracking-tight text-slate-900 sm:text-lg dark:text-slate-100"
                        >
                            <img
                                src="/logo.svg"
                                alt=""
                                aria-hidden="true"
                                className="h-8 w-auto"
                            />
                            <span className="hidden sm:inline">
                                Jump Logbook
                            </span>
                        </a>
                        <a
                            href={routes.logbook({})}
                            className="min-w-0 flex-1 truncate text-sm text-slate-500 transition hover:text-indigo-600 hover:underline dark:text-slate-400 dark:hover:text-indigo-400"
                        >
                            {user.getDisplayName()}'s logbook
                        </a>
                        <div className="ml-auto flex shrink-0 items-center gap-2">
                            <ThemeToggle />
                            <MainMenu isAdmin={user.admin} />
                        </div>
                    </div>
                    <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                        <LogbookActions />
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-8">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
                    {props.title}
                </h1>
                {props.children}
            </main>
        </div>
    );
}
