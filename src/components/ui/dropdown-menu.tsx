import clsx from "clsx";
import { useId, type Child } from "hono/jsx";
import { $assertElement } from "@/utils";
import { Script } from "@/components/script";

export const menuItemClassName =
    "flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800";

export function MenuDivider() {
    return <div className="my-1 h-px bg-slate-100 dark:bg-slate-800"></div>;
}

function $initDropdownMenu(buttonId: string, menuId: string) {
    const button = document.getElementById(buttonId);
    $assertElement(button, HTMLButtonElement);
    const menu = document.getElementById(menuId);
    $assertElement(menu, HTMLDivElement);
    const buttonElement = button;
    const menuElement = menu;

    function setMenuOpen(isOpen: boolean) {
        menuElement.hidden = !isOpen;
        buttonElement.setAttribute("aria-expanded", String(isOpen));
    }

    button.addEventListener("click", (event) => {
        event.stopPropagation();
        setMenuOpen(Boolean(menuElement.hidden));
    });
    document.addEventListener("click", (event) => {
        if (
            !menuElement.hidden &&
            event.target instanceof Node &&
            !menuElement.contains(event.target) &&
            !buttonElement.contains(event.target)
        ) {
            setMenuOpen(false);
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !menuElement.hidden) {
            setMenuOpen(false);
            buttonElement.focus();
        }
    });
}

function DropdownMenuScript(props: { buttonId: string; menuId: string }) {
    return (
        <Script
            $deps={[$assertElement]}
            $args={[props.buttonId, props.menuId]}
            $exec={$initDropdownMenu}
        />
    );
}

export function DropdownMenu(props: {
    label: string;
    button: Child;
    buttonClassName?: string;
    tooltip?: string;
    menuClassName?: string;
    children: Child;
}) {
    const id = useId();
    const menuId = `dropdown-menu-${id}`;
    const buttonId = `dropdown-menu-button-${id}`;
    return (
        <div className="relative">
            <button
                id={buttonId}
                type="button"
                aria-controls={menuId}
                aria-expanded="false"
                aria-label={props.label}
                data-tooltip={props.tooltip}
                className={props.buttonClassName}
            >
                {props.button}
            </button>
            <div
                id={menuId}
                hidden
                className={clsx(
                    "absolute right-0 z-40 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-slate-100/10",
                    props.menuClassName ?? "mt-2",
                )}
            >
                {props.children}
            </div>
            <DropdownMenuScript buttonId={buttonId} menuId={menuId} />
        </div>
    );
}
