import { useAppContext } from "../app";
import { Script } from "../components/helpers";
import * as routes from "../routes";
import { $assertElement } from "../utils";
import { useId } from "hono/jsx";

function LogbookActions() {
    const id = useId();
    const menuId = `logbook-management-menu-${id}`;
    const buttonId = `logbook-management-button-${id}`;

    return (
        <nav className="flex flex-wrap gap-3">
            <a
                href={routes.jumpNew({}, {})}
                className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
                Add jump
            </a>
            <div className="relative">
                <button
                    id={buttonId}
                    type="button"
                    aria-controls={menuId}
                    aria-expanded="false"
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                    Manage logbook
                </button>
                <div
                    id={menuId}
                    hidden
                    className="absolute left-0 z-10 mt-2 w-52 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                >
                    <a
                        href={routes.aircraftList({})}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                        Manage aircraft
                    </a>
                    <a
                        href={routes.gearList({})}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                        Manage gear
                    </a>
                    <a
                        href={routes.jumpTypeList({})}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                        Manage jump types
                    </a>
                    <a
                        href={routes.locationList({})}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                        Manage locations
                    </a>
                    <a
                        href={routes.logbookTransfer({})}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
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
                        }

                        button.addEventListener("click", () => {
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
        </nav>
    );
}

export function LogbookPage(props: { title: string; children: any }) {
    const user = useAppContext().getUser();

    return (
        <main className="mx-auto max-w-3xl space-y-6 py-4">
            <header className="flex flex-col gap-4 border-b border-gray-200 pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <a
                        href={routes.logbook({})}
                        className="text-sm text-blue-700 hover:underline"
                    >
                        {user.getDisplayName()}'s logbook
                    </a>
                    <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
                        {props.title}
                    </h1>
                    <form method="post" action={routes.logout({})}>
                        <button
                            type="submit"
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Log out
                        </button>
                    </form>
                </div>
                <LogbookActions />
            </header>
            {props.children}
        </main>
    );
}
