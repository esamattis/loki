import clsx from "clsx";
import { useId, type Child } from "hono/jsx";
import { $assertElement } from "../utils";
import { Script } from "./helpers";

export const labelClassName =
    "block text-sm font-medium text-slate-700 dark:text-slate-300";

export const controlClassName =
    "block w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30";

const labeledControlClassName = clsx("mt-1.5", controlClassName);

export const fileInputClassName =
    "block w-full cursor-pointer rounded-lg border border-slate-300 bg-slate-50 text-sm text-slate-700 file:mr-3 file:cursor-pointer file:rounded-l-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-indigo-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:file:bg-indigo-500 dark:hover:file:bg-indigo-600";

type ButtonVariant = "primary" | "secondary";
type ButtonSize = "md" | "sm";

const buttonVariantClassName: Record<ButtonVariant, string> = {
    primary:
        "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 focus:ring-indigo-500/40 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus:ring-indigo-400/40",
    secondary:
        "border border-slate-300 bg-slate-50 text-slate-700 shadow-sm hover:bg-slate-100 focus:ring-indigo-500/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:focus:ring-indigo-400/40",
};

const buttonSizeClassName: Record<ButtonSize, string> = {
    md: "rounded-lg px-4 py-2.5 font-medium",
    sm: "rounded-lg px-3 py-1.5 text-sm font-medium",
};

export function buttonClassName(props: {
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
}): string {
    return clsx(
        "inline-flex items-center justify-center transition focus:outline-none focus:ring-2",
        buttonVariantClassName[props.variant ?? "primary"],
        buttonSizeClassName[props.size ?? "md"],
        props.className,
    );
}

export function Button(props: {
    type?: "button" | "submit" | "reset";
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
    id?: string;
    value?: string;
    hidden?: boolean;
    disabled?: boolean;
    title?: string;
    "data-tooltip"?: string;
    "aria-label"?: string;
    "aria-controls"?: string;
    "aria-expanded"?: string;
    children: Child;
}) {
    return (
        <button
            id={props.id}
            type={props.type ?? "button"}
            value={props.value}
            hidden={props.hidden}
            disabled={props.disabled}
            title={props.title}
            data-tooltip={props["data-tooltip"]}
            aria-label={props["aria-label"]}
            aria-controls={props["aria-controls"]}
            aria-expanded={props["aria-expanded"]}
            className={buttonClassName({
                variant: props.variant,
                size: props.size,
                className: props.className,
            })}
        >
            {props.children}
        </button>
    );
}

export function ButtonLink(props: {
    href: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
    title?: string;
    "data-tooltip"?: string;
    "aria-label"?: string;
    "aria-disabled"?: boolean;
    children: Child;
}) {
    return (
        <a
            href={props.href}
            title={props.title}
            data-tooltip={props["data-tooltip"]}
            aria-label={props["aria-label"]}
            aria-disabled={props["aria-disabled"]}
            className={buttonClassName({
                variant: props.variant,
                size: props.size,
                className: props.className,
            })}
        >
            {props.children}
        </a>
    );
}

export function Input(props: {
    id?: string;
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    autofocus?: boolean;
    value?: string;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
}) {
    return (
        <label className={clsx(labelClassName, props.className)}>
            {props.label}
            <input
                id={props.id}
                name={props.name}
                type={props.type ?? "text"}
                required={props.required}
                autofocus={props.autofocus}
                value={props.value}
                placeholder={props.placeholder}
                className={clsx(labeledControlClassName, props.inputClassName)}
            />
        </label>
    );
}

export function NumberInput(props: {
    id?: string;
    name?: string;
    label: string;
    min?: string;
    required?: boolean;
    autofocus?: boolean;
    value?: string;
    className?: string;
    inputClassName?: string;
    persist?: string;
}) {
    const generatedId = useId();
    const id = props.id ?? generatedId;
    return (
        <label className={clsx(labelClassName, props.className)}>
            {props.label}
            <input
                id={id}
                name={props.name}
                type="number"
                min={props.min}
                required={props.required}
                autofocus={props.autofocus}
                value={props.value}
                className={clsx(labeledControlClassName, props.inputClassName)}
            />
            {props.persist ? (
                <Script
                    $deps={[$assertElement]}
                    $args={[id, props.persist]}
                    $exec={(id, persistKey) => {
                        const input = document.getElementById(id);
                        $assertElement(input, HTMLInputElement);
                        const storageKey = `number-input-persist:${persistKey}`;
                        const stored = sessionStorage.getItem(storageKey);
                        if (stored !== null) {
                            input.value = stored;
                        }
                        input.addEventListener("input", () => {
                            sessionStorage.setItem(storageKey, input.value);
                        });
                    }}
                />
            ) : null}
        </label>
    );
}

export function Select(props: {
    name: string;
    label: string;
    required?: boolean;
    className?: string;
    selectClassName?: string;
    persist?: string;
    children: any;
}) {
    const id = useId();
    return (
        <label className={clsx(labelClassName, props.className)}>
            {props.label}
            <select
                id={id}
                name={props.name}
                required={props.required}
                className={clsx(
                    "appearance-none bg-no-repeat pr-10",
                    labeledControlClassName,
                    props.selectClassName,
                )}
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
                    backgroundPosition: "right 0.6rem center",
                    backgroundSize: "1.1rem",
                }}
            >
                {props.children}
            </select>
            {props.persist ? (
                <Script
                    $deps={[$assertElement]}
                    $args={[id, props.persist]}
                    $exec={(id, persistKey) => {
                        const select = document.getElementById(id);
                        $assertElement(select, HTMLSelectElement);
                        const storageKey = `select-persist:${persistKey}`;
                        const stored = sessionStorage.getItem(storageKey);
                        if (
                            stored !== null &&
                            Array.from(select.options).some(
                                (option) => option.value === stored,
                            )
                        ) {
                            select.value = stored;
                        }
                        select.addEventListener("change", () => {
                            sessionStorage.setItem(storageKey, select.value);
                        });
                    }}
                />
            ) : null}
        </label>
    );
}

export function Textarea(props: {
    name: string;
    label: string;
    rows?: number;
    value?: string;
    placeholder?: string;
    className?: string;
    textareaClassName?: string;
    persist?: string;
}) {
    const id = useId();
    return (
        <label className={clsx(labelClassName, props.className)}>
            {props.label}
            <textarea
                id={id}
                name={props.name}
                rows={props.rows ?? 4}
                placeholder={props.placeholder}
                className={clsx(
                    "resize-y",
                    labeledControlClassName,
                    props.textareaClassName,
                )}
            >
                {props.value}
            </textarea>
            {props.persist ? (
                <Script
                    $deps={[$assertElement]}
                    $args={[id, props.persist]}
                    $exec={(id, persistKey) => {
                        const textarea = document.getElementById(id);
                        $assertElement(textarea, HTMLTextAreaElement);
                        const storageKey = `textarea-persist:${persistKey}`;
                        const stored = sessionStorage.getItem(storageKey);
                        if (stored !== null) {
                            textarea.value = stored;
                        }
                        textarea.addEventListener("input", () => {
                            sessionStorage.setItem(storageKey, textarea.value);
                        });
                    }}
                />
            ) : null}
        </label>
    );
}

export function Checkbox(props: {
    name: string;
    value: string;
    label: string;
    checked?: boolean;
    className?: string;
    hidden?: boolean;
    "data-archived"?: string;
}) {
    return (
        <label
            className={clsx(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/60 dark:has-[:checked]:border-indigo-500 dark:has-[:checked]:bg-indigo-900/40 dark:has-[:checked]:text-indigo-200",
                props.className,
            )}
            hidden={props.hidden}
            data-archived={props["data-archived"]}
        >
            <input
                name={props.name}
                type="checkbox"
                value={props.value}
                checked={props.checked}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-600 dark:text-indigo-500 dark:focus:ring-indigo-400/40"
            />
            {props.label}
        </label>
    );
}

export function FormActions(props: {
    submitLabel: string;
    cancelHref: string;
}) {
    return (
        <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary">
                {props.submitLabel}
            </Button>
            <ButtonLink href={props.cancelHref} variant="secondary">
                Cancel
            </ButtonLink>
        </div>
    );
}
