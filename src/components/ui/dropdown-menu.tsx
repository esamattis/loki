import clsx from "clsx";
import { useId, type Child } from "hono/jsx";
import { $elById } from "@/utils";
import { Script } from "@/components/script";

const menuItemClassName =
    "flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50 sm:py-2 dark:text-slate-300 dark:hover:bg-slate-800";

export function MenuLink(props: { href: string; children: Child }) {
    return (
        <a href={props.href} className={menuItemClassName}>
            {props.children}
        </a>
    );
}

export function MenuButton(props: {
    type?: "button" | "submit";
    children: Child;
}) {
    return (
        <button type={props.type ?? "button"} className={menuItemClassName}>
            {props.children}
        </button>
    );
}

export function MenuDivider() {
    return <div className="my-1 h-px bg-slate-100 dark:bg-slate-800"></div>;
}

function $initDropdownMenu(buttonId: string, menuId: string) {
    const button = $elById(buttonId, HTMLButtonElement);
    const menu = $elById(menuId, HTMLDivElement);
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
            $deps={[$elById]}
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
                data-loki-tooltip={props.tooltip}
                className={props.buttonClassName}
            >
                {props.button}
            </button>
            <div
                id={menuId}
                hidden
                className={clsx(
                    "absolute right-0 z-40 w-56 overflow-x-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-slate-100/10",
                    props.menuClassName ?? "mt-2",
                )}
            >
                {props.children}
            </div>
            <DropdownMenuScript buttonId={buttonId} menuId={menuId} />
        </div>
    );
}
