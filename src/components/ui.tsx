import clsx from "clsx";
import { useId, type Child } from "hono/jsx";
import { Script } from "./helpers";
import { $assertElement } from "../utils";
import { buttonClassName, Select } from "./form";

export const menuItemClassName =
    "flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800";

export function MenuDivider() {
    return <div className="my-1 h-px bg-slate-100 dark:bg-slate-800"></div>;
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
            <Script
                $deps={[$assertElement]}
                $args={[buttonId, menuId]}
                $exec={(buttonId, menuId) => {
                    const button = document.getElementById(buttonId);
                    $assertElement(button, HTMLButtonElement);
                    const menu = document.getElementById(menuId);
                    $assertElement(menu, HTMLDivElement);

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

export function Dialog(props: {
    id?: string;
    openButtonId?: string;
    title: string;
    description?: Child;
    children: Child;
    className?: string;
}) {
    const generatedId = useId();
    const dialogId = props.id ?? generatedId;

    return (
        <>
            <dialog
                id={dialogId}
                className={clsx(
                    "m-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
                    props.className,
                )}
            >
                <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                        <h2 className="text-base font-semibold">
                            {props.title}
                        </h2>
                        <button
                            type="button"
                            value="cancel"
                            className="rounded-lg px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                            Close
                        </button>
                    </div>
                    {props.description ? (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {props.description}
                        </p>
                    ) : null}
                    {props.children}
                </div>
            </dialog>
            <Script
                $deps={[$assertElement]}
                $args={[dialogId, props.openButtonId ?? ""]}
                $exec={(dialogId, openButtonId) => {
                    const dialog = document.getElementById(dialogId);
                    $assertElement(dialog, HTMLDialogElement);

                    if (openButtonId !== "") {
                        const openButton =
                            document.getElementById(openButtonId);
                        $assertElement(openButton, HTMLButtonElement);
                        openButton.addEventListener("click", () => {
                            dialog.showModal();
                        });
                    }

                    dialog.addEventListener("click", (event) => {
                        const target = event.target;
                        if (!(target instanceof Element)) {
                            return;
                        }
                        if (target === dialog) {
                            dialog.close();
                            return;
                        }
                        if (
                            target instanceof HTMLButtonElement &&
                            target.value === "cancel"
                        ) {
                            dialog.close();
                        }
                    });
                }}
            />
        </>
    );
}

export function DangerZone(props: {
    children: any;
    label?: string;
    className?: string;
}) {
    return (
        <div
            className={clsx(
                "mt-6 rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/60 dark:bg-red-950/20",
                props.className,
            )}
        >
            <p className="mb-3 text-sm font-medium text-red-700 dark:text-red-300">
                {props.label ?? "Danger zone"}
            </p>
            {props.children}
        </div>
    );
}

const dangerButtonClassName = buttonClassName({
    variant: "secondary",
    className:
        "border-red-300 text-red-600 hover:bg-red-50 focus:ring-red-500/40 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40 dark:focus:ring-red-400/40",
});

const confirmDangerCountdownSeconds =
    process.env.PLAYWRIGHT_TEST === "1" ? 0 : 3;

export function ConfirmDangerButton(props: {
    label: string;
    confirmLabel: string;
    className?: string;
}) {
    const buttonId = useId();
    return (
        <>
            <button
                id={buttonId}
                type="submit"
                className={clsx(dangerButtonClassName, props.className)}
            >
                {props.label}
            </button>
            <Script
                $deps={[$assertElement]}
                $args={[
                    buttonId,
                    props.label,
                    props.confirmLabel,
                    confirmDangerCountdownSeconds,
                ]}
                $exec={(
                    buttonId: string,
                    label: string,
                    confirmLabel: string,
                    countdownSeconds: number,
                ) => {
                    const el = document.getElementById(buttonId);
                    $assertElement(el, HTMLButtonElement);
                    const button = el;
                    let state: "idle" | "ready" = "idle";
                    let timer: ReturnType<typeof setInterval> | null = null;

                    function clearTimer() {
                        if (timer) {
                            clearInterval(timer);
                            timer = null;
                        }
                    }

                    function reset() {
                        if (state === "idle") {
                            return;
                        }
                        clearTimer();
                        state = "idle";
                        button.disabled = false;
                        button.classList.remove(
                            "opacity-50",
                            "cursor-not-allowed",
                            "border-red-500",
                            "bg-red-100",
                            "dark:bg-red-950/60",
                        );
                        button.textContent = label;
                    }

                    function onOutsideClick(event: MouseEvent) {
                        const target = event.target;
                        if (target instanceof Node && button.contains(target)) {
                            return;
                        }
                        reset();
                    }

                    function armReady() {
                        button.disabled = false;
                        button.classList.remove(
                            "opacity-50",
                            "cursor-not-allowed",
                        );
                        button.classList.add(
                            "border-red-500",
                            "bg-red-100",
                            "dark:bg-red-950/60",
                        );
                        button.textContent = confirmLabel;
                        // Defer so the arming click does not consume the listener.
                        setTimeout(() => {
                            if (state !== "ready") {
                                return;
                            }
                            document.addEventListener("click", onOutsideClick, {
                                once: true,
                            });
                        }, 0);
                    }

                    button.addEventListener("click", (event) => {
                        if (state === "ready") {
                            return;
                        }
                        event.preventDefault();
                        state = "ready";
                        if (countdownSeconds <= 0) {
                            armReady();
                            return;
                        }
                        button.disabled = true;
                        button.classList.add(
                            "opacity-50",
                            "cursor-not-allowed",
                            "border-red-500",
                            "bg-red-100",
                            "dark:bg-red-950/60",
                        );
                        let count = countdownSeconds;
                        button.textContent = `${confirmLabel} (${count}s)`;
                        timer = setInterval(() => {
                            count -= 1;
                            if (count <= 0) {
                                clearTimer();
                                armReady();
                                return;
                            }
                            button.textContent = `${confirmLabel} (${count}s)`;
                        }, 1000);
                    });
                }}
            />
        </>
    );
}

export function MergeIntoForm(props: {
    options: { uuid: string; name: string }[];
    description: string;
    selectLabel: string;
    buttonLabel?: string;
    className?: string;
}) {
    if (props.options.length === 0) {
        return null;
    }
    const buttonLabel = props.buttonLabel ?? "Merge";
    return (
        <form
            method="post"
            className={clsx(
                "mb-4 space-y-3 border-b border-red-200 pb-4 dark:border-red-900/60",
                props.className,
            )}
        >
            <input type="hidden" name="action" value="merge" />
            <p className="text-sm text-red-700/90 dark:text-red-300/90">
                {props.description}
            </p>
            <Select name="targetUuid" label={props.selectLabel} required>
                <option value="">Select…</option>
                {props.options.map((option) => (
                    <option value={option.uuid}>{option.name}</option>
                ))}
            </Select>
            <ConfirmDangerButton
                label={buttonLabel}
                confirmLabel="Confirm merge"
            />
        </form>
    );
}

export function ConfirmDeleteButton(props: {
    label: string;
    className?: string;
}) {
    return (
        <form method="post" className={clsx("flex", props.className)}>
            <input type="hidden" name="action" value="delete" />
            <ConfirmDangerButton
                label={props.label}
                confirmLabel="Confirm delete"
            />
        </form>
    );
}

export function Details(props: {
    summary: any;
    open?: boolean;
    className?: string;
    summaryClassName?: string;
    children: any;
}) {
    return (
        <details open={props.open} className={clsx("group", props.className)}>
            <summary
                className={clsx(
                    "flex cursor-pointer list-none items-center gap-2 marker:hidden",
                    props.summaryClassName,
                )}
            >
                <svg
                    aria-hidden="true"
                    className="h-4 w-4 flex-none text-slate-400 transition-transform group-open:rotate-90 dark:text-slate-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M9 5l7 7-7 7"
                    />
                </svg>
                {props.summary}
            </summary>
            {props.children}
        </details>
    );
}

export function Code(props: {
    children: string;
    codeId?: string;
    codeProps?: Record<string, string>;
    className?: string;
}) {
    const generatedCodeId = useId();
    const buttonId = useId();
    const codeId = props.codeId ?? generatedCodeId;
    return (
        <div className="relative">
            <pre
                className={clsx(
                    "overflow-x-auto rounded-lg bg-black p-3 pr-16 text-xs text-slate-100",
                    props.className,
                )}
            >
                <code id={codeId} {...props.codeProps}>
                    {props.children}
                </code>
            </pre>
            <button
                id={buttonId}
                type="button"
                aria-label="Copy command to clipboard"
                className="absolute right-2 top-2 rounded-md bg-slate-700/80 px-2 py-1 text-xs text-slate-100 transition hover:bg-slate-600"
            >
                Copy
            </button>
            <Script
                $deps={[$assertElement]}
                $args={[codeId, buttonId]}
                $exec={(codeId, buttonId) => {
                    const code = document.getElementById(codeId);
                    $assertElement(code, HTMLElement);
                    const button = document.getElementById(buttonId);
                    $assertElement(button, HTMLButtonElement);
                    button.addEventListener("click", () => {
                        navigator.clipboard.writeText(code.textContent ?? "");
                        const original = button.textContent;
                        button.textContent = "Copied!";
                        setTimeout(() => {
                            button.textContent = original;
                        }, 1500);
                    });
                }}
            />
        </div>
    );
}
