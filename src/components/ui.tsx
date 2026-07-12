import clsx from "clsx";
import { useId } from "hono/jsx";
import { Script } from "./helpers";
import { $assertElement } from "../utils";

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
                    className="h-4 w-4 flex-none text-slate-400 transition-transform group-open:rotate-90"
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
