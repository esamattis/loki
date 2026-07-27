import clsx from "clsx";
import { useId } from "hono/jsx";
import { $select } from "@/core/utils";
import { Script } from "@/core/components/script";

/** Copies code text to the clipboard and briefly shows “Copied!”. */
function $initCopyCode(codeId: string, buttonId: string) {
    const code = $select.id(codeId, HTMLElement);
    const button = $select.id(buttonId, HTMLButtonElement);
    button.addEventListener("click", () => {
        navigator.clipboard.writeText(code.textContent ?? "");
        const original = button.textContent;
        button.textContent = "Copied!";
        setTimeout(() => {
            button.textContent = original;
        }, 1500);
    });
}

/** Client script bridge for `Code` copy button. */
function CopyCodeScript(props: { codeId: string; buttonId: string }) {
    return (
        <Script
            $deps={[$select]}
            $args={[props.codeId, props.buttonId]}
            $exec={$initCopyCode}
        />
    );
}

/**
 * Monospace code block with a Copy button that writes the text to the clipboard.
 *
 * @param props.children - Plain text code content (not HTML).
 * @param props.codeId - Optional id on the `<code>` element.
 * @param props.codeProps - Extra attributes spread onto `<code>`.
 * @param props.className - Classes on the `<pre>`; defaults include padding.
 */
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
                    "overflow-x-auto rounded-lg bg-black text-slate-100",
                    props.className ?? "p-3 pr-16 text-xs",
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
            <CopyCodeScript codeId={codeId} buttonId={buttonId} />
        </div>
    );
}
