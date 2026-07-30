import clsx from "clsx";
import { useId, type Child } from "hono/jsx";
import { $select } from "@/core/utils";
import { Script } from "@/core/components/script";

/** Shared Tailwind classes for dropdown menu links and buttons. */
const menuItemClassName =
    "flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50 sm:py-2 dark:text-slate-300 dark:hover:bg-slate-800";

/**
 * Navigation item inside a `DropdownMenu`.
 *
 * @param props.href - Destination URL.
 * @param props.children - Menu item content (icon + label).
 */
export function MenuLink(props: { href: string; children: Child }) {
    return (
        <a href={props.href} className={menuItemClassName}>
            {props.children}
        </a>
    );
}

/**
 * Button item inside a `DropdownMenu` (e.g. logout submit).
 *
 * @param props.type - Button type; defaults to `"button"`.
 * @param props.children - Menu item content.
 */
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

/** Horizontal rule separating groups inside a `DropdownMenu`. */
export function MenuDivider() {
    return (
        <div
            role="separator"
            className="my-1 h-px bg-slate-100 dark:bg-slate-800"
        ></div>
    );
}

/**
 * Toggles the menu on button click; closes on outside click or Escape.
 */
function $initDropdownMenu(buttonId: string, menuId: string) {
    const button = $select.id(buttonId, HTMLButtonElement);
    const menu = $select.id(menuId, HTMLDivElement);
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

/** Client script bridge for `DropdownMenu`. */
function DropdownMenuScript(props: { buttonId: string; menuId: string }) {
    return (
        <Script
            $deps={[$select]}
            $args={[props.buttonId, props.menuId]}
            $exec={$initDropdownMenu}
        />
    );
}

/**
 * Disclosure menu anchored to a trigger button. Place `MenuLink`, `MenuButton`,
 * and `MenuDivider` as children.
 *
 * @param props.label - Accessible name for the trigger (`aria-label`).
 * @param props.button - Trigger content (icon or label).
 * @param props.buttonClassName - Classes on the trigger button.
 * @param props.tooltip - Optional `data-loki-tooltip` on the trigger.
 * @param props.menuClassName - Extra classes on the menu panel.
 * @param props.children - Menu items.
 */
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
