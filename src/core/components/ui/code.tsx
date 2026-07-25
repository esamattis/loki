import clsx from "clsx";
import { useId } from "hono/jsx";
import { $select } from "@/utils";
import { Script } from "@/components/script";

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

function CopyCodeScript(props: { codeId: string; buttonId: string }) {
    return (
        <Script
            $deps={[$select]}
            $args={[props.codeId, props.buttonId]}
            $exec={$initCopyCode}
        />
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
