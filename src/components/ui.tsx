import clsx from "clsx";
import { useId } from "hono/jsx";
import { Script } from "./helpers";
import { $assertElement } from "../utils";

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

export function ConfirmDeleteButton(props: {
    label: string;
    className?: string;
}) {
    const buttonId = useId();
    return (
        <form method="post" className={clsx("flex", props.className)}>
            <input type="hidden" name="action" value="delete" />
            <button
                id={buttonId}
                type="submit"
                className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-4 py-2.5 font-medium text-red-600 shadow-sm transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/40 dark:border-red-800 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/40 dark:focus:ring-red-400/40"
            >
                {props.label}
            </button>
            <Script
                $deps={[$assertElement]}
                $args={[buttonId]}
                $exec={(buttonId) => {
                    const button = document.getElementById(buttonId);
                    $assertElement(button, HTMLButtonElement);
                    let state: "idle" | "ready" = "idle";
                    let timer: ReturnType<typeof setInterval> | null = null;
                    button.addEventListener("click", (event) => {
                        if (state === "ready") {
                            return;
                        }
                        event.preventDefault();
                        state = "ready";
                        button.disabled = true;
                        button.classList.add(
                            "opacity-50",
                            "cursor-not-allowed",
                            "border-red-500",
                            "bg-red-100",
                            "dark:bg-red-950/60",
                        );
                        let count = 3;
                        button.textContent = `Confirm delete (${count}s)`;
                        timer = setInterval(() => {
                            count -= 1;
                            if (count <= 0) {
                                if (timer) clearInterval(timer);
                                timer = null;
                                button.disabled = false;
                                button.classList.remove(
                                    "opacity-50",
                                    "cursor-not-allowed",
                                );
                                button.textContent = "Confirm delete";
                                return;
                            }
                            button.textContent = `Confirm delete (${count}s)`;
                        }, 1000);
                    });
                }}
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
                    "overflow-x-auto rounded-lg bg-slate-900 p-3 pr-16 text-xs text-slate-100",
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
