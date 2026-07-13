import { useAppContext } from "../app";
import { Script, Style } from "../components/helpers";
import * as routes from "../routes";
import { $assertElement } from "../utils";
import { useId } from "hono/jsx";

function ChevronDownIcon() {
    return (
        <svg
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-slate-400 transition-transform dark:text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M19 9l-7 7-7-7"
            />
        </svg>
    );
}

function ManageLogbookMenu() {
    const id = useId();
    const menuId = `logbook-management-menu-${id}`;
    const buttonId = `logbook-management-button-${id}`;

    return (
        <div className="relative">
            <button
                id={buttonId}
                type="button"
                aria-controls={menuId}
                aria-expanded="false"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-indigo-400/40"
            >
                Manage logbook
                <ChevronDownIcon />
            </button>
            <div
                id={menuId}
                hidden
                className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-slate-100/10"
            >
                <a
                    href={routes.aircraftList({})}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                    Manage aircraft
                </a>
                <a
                    href={routes.gearList({})}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                    Manage gear
                </a>
                <a
                    href={routes.jumpTypeList({})}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                    Manage jump types
                </a>
                <a
                    href={routes.locationList({})}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                    Manage locations
                </a>
                <div className="my-1 h-px bg-slate-100 dark:bg-slate-800"></div>
                <a
                    href={routes.logbookStatistics({})}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                    Statistics
                </a>
                <div className="my-1 h-px bg-slate-100 dark:bg-slate-800"></div>
                <a
                    href={routes.logbookTransfer({})}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                    Import or export
                </a>
            </div>
            <Script
                $deps={[$assertElement]}
                $args={[buttonId, menuId]}
                $exec={(buttonId, menuId) => {
                    const button = document.getElementById(buttonId);
                    $assertElement(button, HTMLButtonElement);
                    const menu = document.getElementById(menuId);
                    $assertElement(menu, HTMLDivElement);
                    if (
                        !(button instanceof HTMLButtonElement) ||
                        !(menu instanceof HTMLDivElement)
                    ) {
                        return;
                    }
                    const chevron = button.querySelector("svg");

                    function setMenuOpen(
                        menuElement: HTMLDivElement,
                        buttonElement: HTMLButtonElement,
                        isOpen: boolean,
                    ) {
                        menuElement.hidden = !isOpen;
                        buttonElement.setAttribute(
                            "aria-expanded",
                            String(isOpen),
                        );
                        if (chevron) {
                            chevron.style.transform = isOpen
                                ? "rotate(180deg)"
                                : "";
                        }
                    }

                    button.addEventListener("click", (event) => {
                        event.stopPropagation();
                        setMenuOpen(menu, button, Boolean(menu.hidden));
                    });

                    document.addEventListener("click", (event) => {
                        if (
                            !menu.hidden &&
                            event.target instanceof Node &&
                            !menu.contains(event.target) &&
                            !button.contains(event.target)
                        ) {
                            setMenuOpen(menu, button, false);
                        }
                    });

                    document.addEventListener("keydown", (event) => {
                        if (event.key === "Escape" && !menu.hidden) {
                            setMenuOpen(menu, button, false);
                            button.focus();
                        }
                    });
                }}
            />
        </div>
    );
}

function LogbookActions() {
    return (
        <nav className="flex flex-wrap items-center gap-2">
            <a
                href={routes.jumpNew({}, {})}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus:ring-indigo-400/40"
            >
                <svg
                    aria-hidden="true"
                    className="h-4 w-4"
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
                Add jump
            </a>
            <a
                href={routes.jumpFromImage({})}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-indigo-400/40"
            >
                From image
            </a>
            <ManageLogbookMenu />
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
                            <span
                                aria-hidden="true"
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm text-white shadow-sm"
                            >
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    stroke-width="2.2"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M12 19V5M5 12l7-7 7 7"
                                    />
                                </svg>
                            </span>
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
                            {user.admin && (
                                <a
                                    href={routes.admin({})}
                                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-indigo-400/40"
                                >
                                    Admin
                                </a>
                            )}
                            <a
                                href={routes.preferences({})}
                                aria-label="Preferences"
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-indigo-400/40"
                            >
                                <svg
                                    aria-hidden="true"
                                    className="h-4 w-4 sm:hidden"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.4 15a1.7 1.7 0 00.34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 00-1.88-.34 1.7 1.7 0 00-1.03 1.56v.08h-2.4v-.08a1.7 1.7 0 00-1.03-1.56 1.7 1.7 0 00-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 008.46 15a1.7 1.7 0 00-1.56-1.03h-.08v-2.4h.08A1.7 1.7 0 008.46 10a1.7 1.7 0 00-.34-1.88l-.06-.06 1.7-1.7.06.06a1.7 1.7 0 001.88.34 1.7 1.7 0 001.03-1.56v-.08h2.4v.08a1.7 1.7 0 001.03 1.56 1.7 1.7 0 001.88-.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0019.4 10a1.7 1.7 0 001.56 1.03h.08v2.4h-.08A1.7 1.7 0 0019.4 15z"
                                    />
                                </svg>
                                <span className="hidden sm:inline">
                                    Preferences
                                </span>
                            </a>
                            <form method="post" action={routes.logout({})}>
                                <button
                                    type="submit"
                                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-indigo-400/40"
                                    title="Log out"
                                >
                                    <svg
                                        aria-hidden="true"
                                        className="h-4 w-4 sm:hidden"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1"
                                        />
                                    </svg>
                                    <span className="hidden sm:inline">
                                        Log out
                                    </span>
                                </button>
                            </form>
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
