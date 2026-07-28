import clsx from "clsx";
import { useId, type Child } from "hono/jsx";
import { CloseIcon } from "@/core/components/icons";
import { $select } from "@/core/utils";
import { Script } from "@/core/components/script";

/** Shared Tailwind classes for form field labels. */
export const labelClassName =
    "block text-sm font-medium text-slate-700 dark:text-slate-300";

/** Shared Tailwind classes for text inputs, selects, and textareas. */
export const controlClassName =
    "block w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30";

/** Stores the labeled control class name used by this module. */
const labeledControlClassName = clsx("mt-1.5", controlClassName);

/** Shared Tailwind classes for native file inputs. */
export const fileInputClassName =
    "block h-10 w-full cursor-pointer overflow-hidden rounded-lg border border-slate-300 bg-slate-50 p-0 text-sm leading-10 text-slate-700 file:mr-3 file:h-10 file:cursor-pointer file:rounded-l-lg file:border-0 file:bg-indigo-600 file:px-4 file:font-medium file:leading-10 file:text-white hover:file:bg-indigo-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:file:bg-indigo-500 dark:hover:file:bg-indigo-600";

/** Visual style for `Button` / `ButtonLink`. */
type ButtonVariant = "primary" | "secondary" | "danger";
/** Size token for `Button` / `ButtonLink`. */
type ButtonSize = "md" | "sm";

/** Stores the button variant class name used by this module. */
const buttonVariantClassName: Record<ButtonVariant, string> = {
    primary:
        "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 focus:ring-indigo-500/40 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus:ring-indigo-400/40",
    secondary:
        "border border-slate-300 bg-slate-200 text-slate-800 shadow-sm hover:bg-slate-300 focus:ring-indigo-500/40 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 dark:focus:ring-indigo-400/40",
    danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 focus:ring-red-500/40 dark:bg-red-500 dark:hover:bg-red-600 dark:focus:ring-red-400/40",
};

/** Stores the button size class name used by this module. */
const buttonSizeClassName: Record<ButtonSize, string> = {
    md: "rounded-lg px-4 py-2.5 font-medium",
    sm: "rounded-lg px-3 py-1.5 text-sm font-medium",
};

/**
 * Builds Tailwind classes for buttons and button-styled links.
 *
 * @param props.variant - Visual style; defaults to `"primary"`.
 * @param props.size - Padding/type scale; defaults to `"md"`.
 * @param props.className - Extra classes merged last.
 */
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

/**
 * Styled `<button>` for actions and form submits.
 *
 * @param props.type - Button type; defaults to `"button"`.
 * @param props.form - Associated form id when the button is outside the form.
 * @param props.variant - Visual style; defaults to `"primary"`.
 * @param props.size - Padding/type scale; defaults to `"md"`.
 * @param props.className - Extra classes.
 * @param props.id - Element id.
 * @param props.value - Submit value when used as a named submitter.
 * @param props.hidden - Hides the button when true.
 * @param props.disabled - Disables the button when true.
 * @param props.title - Native title tooltip.
 * @param props["data-loki-tooltip"] - Tooltip text for the global tooltip system.
 * @param props["aria-label"] - Accessible name when children are not descriptive.
 * @param props["aria-controls"] - Id of the controlled element (e.g. menu).
 * @param props["aria-expanded"] - Expanded state for disclosure controls.
 * @param props.children - Button label or content.
 */
export function Button(props: {
    type?: "button" | "submit" | "reset";
    form?: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
    id?: string;
    value?: string;
    hidden?: boolean;
    disabled?: boolean;
    title?: string;
    "data-loki-tooltip"?: string;
    "aria-label"?: string;
    "aria-controls"?: string;
    "aria-expanded"?: string;
    children: Child;
}) {
    return (
        <button
            id={props.id}
            type={props.type ?? "button"}
            form={props.form}
            value={props.value}
            hidden={props.hidden}
            disabled={props.disabled}
            title={props.title}
            data-loki-tooltip={props["data-loki-tooltip"]}
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

/**
 * Anchor styled like `Button` for navigation that should look like an action.
 *
 * @param props.href - Destination URL.
 * @param props.download - When true, hints the browser to download the target.
 * @param props.icon - Optional leading icon node.
 * @param props.variant - Visual style; defaults to `"primary"`.
 * @param props.size - Padding/type scale; defaults to `"md"`.
 * @param props.className - Extra classes.
 * @param props.title - Native title tooltip.
 * @param props["data-loki-tooltip"] - Tooltip text for the global tooltip system.
 * @param props["aria-label"] - Accessible name when children are not descriptive.
 * @param props["aria-current"] - Set to `"page"` for the current nav item.
 * @param props["aria-disabled"] - Marks the link as disabled for AT.
 * @param props.children - Link label.
 */
export function ButtonLink(props: {
    href: string;
    download?: boolean;
    icon?: Child;
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
    title?: string;
    "data-loki-tooltip"?: string;
    "aria-label"?: string;
    "aria-current"?: "page";
    "aria-disabled"?: boolean;
    children: Child;
}) {
    return (
        <a
            href={props.href}
            download={props.download}
            title={props.title}
            data-loki-tooltip={props["data-loki-tooltip"]}
            aria-label={props["aria-label"]}
            aria-current={props["aria-current"]}
            aria-disabled={props["aria-disabled"]}
            className={buttonClassName({
                variant: props.variant,
                size: props.size,
                className: props.className,
            })}
        >
            {props.icon}
            {props.children}
        </a>
    );
}

/**
 * Labeled text-like input. Use `value` (not `defaultValue`) for SSR-filled fields.
 *
 * @param props.id - Optional input id.
 * @param props.name - Form field name.
 * @param props.label - Visible label text wrapping the control.
 * @param props.type - Input type; defaults to `"text"`.
 * @param props.required - Marks the field required.
 * @param props.autofocus - Focuses the field on load when true.
 * @param props.value - Current value for SSR.
 * @param props.placeholder - Placeholder text.
 * @param props.className - Classes on the label wrapper.
 * @param props.inputClassName - Extra classes on the input.
 */
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

/**
 * Labeled file input with shared file-picker styling.
 *
 * @param props.id - Optional input id.
 * @param props.name - Form field name.
 * @param props.label - Visible label text wrapping the control.
 * @param props.accept - Accepted MIME types / extensions.
 * @param props.required - Marks the field required.
 * @param props.multiple - Allows selecting multiple files.
 * @param props.className - Classes on the label wrapper.
 * @param props.inputClassName - Extra classes on the input.
 */
export function FileInput(props: {
    id?: string;
    name?: string;
    label: string;
    accept?: string;
    required?: boolean;
    multiple?: boolean;
    className?: string;
    inputClassName?: string;
}) {
    return (
        <label className={clsx(labelClassName, props.className)}>
            {props.label}
            <input
                id={props.id}
                name={props.name}
                type="file"
                accept={props.accept}
                required={props.required}
                multiple={props.multiple}
                className={clsx(
                    "mt-1.5",
                    fileInputClassName,
                    props.inputClassName,
                )}
            />
        </label>
    );
}

/**
 * Labeled number input. When `persist` is set, the value is kept in
 * `sessionStorage` across navigations under that key.
 *
 * @param props.id - Optional input id; generated when omitted.
 * @param props.name - Form field name.
 * @param props.label - Visible label text.
 * @param props.min - Minimum value attribute.
 * @param props.max - Maximum value attribute.
 * @param props.step - Step attribute.
 * @param props.required - Marks the field required.
 * @param props.autofocus - Focuses the field on load when true.
 * @param props.value - Current value for SSR.
 * @param props.className - Classes on the label wrapper.
 * @param props.inputClassName - Extra classes on the input.
 * @param props.persist - Session storage key suffix for client-side persistence.
 * @param props.tooltip - Tooltip on the label text.
 */
export function NumberInput(props: {
    id?: string;
    name?: string;
    label: string;
    min?: string;
    max?: string;
    step?: string;
    required?: boolean;
    autofocus?: boolean;
    value?: string;
    className?: string;
    inputClassName?: string;
    persist?: string;
    tooltip?: string;
}) {
    const generatedId = useId();
    const id = props.id ?? generatedId;
    return (
        <label className={clsx(labelClassName, props.className)}>
            {props.tooltip ? (
                <span data-loki-tooltip={props.tooltip}>{props.label}</span>
            ) : (
                props.label
            )}
            <input
                id={id}
                name={props.name}
                type="number"
                min={props.min}
                max={props.max}
                step={props.step}
                required={props.required}
                autofocus={props.autofocus}
                value={props.value}
                className={clsx(labeledControlClassName, props.inputClassName)}
            />
            {props.persist ? (
                <Script
                    $deps={[$select]}
                    $args={[id, props.persist]}
                    $exec={(id, persistKey) => {
                        const input = $select.id(id, HTMLInputElement);
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

/**
 * Labeled select. Mark selected options with the `selected` attribute.
 * When `persist` is set, the choice is restored from `sessionStorage`.
 *
 * @param props.name - Form field name.
 * @param props.label - Visible label text.
 * @param props.required - Marks the field required.
 * @param props.className - Classes on the label wrapper.
 * @param props.selectClassName - Extra classes on the select.
 * @param props.persist - Session storage key suffix for client-side persistence.
 * @param props.children - `<option>` elements.
 */
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
                    $deps={[$select]}
                    $args={[id, props.persist]}
                    $exec={(id, persistKey) => {
                        const select = $select.id(id, HTMLSelectElement);
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

/**
 * Labeled textarea. Pass the body via `value` (children of the element), not
 * `defaultValue`. When `persist` is set, the text is kept in `sessionStorage`.
 *
 * @param props.name - Form field name.
 * @param props.label - Visible label text.
 * @param props.rows - Visible row count; defaults to 4.
 * @param props.value - Current text for SSR.
 * @param props.placeholder - Placeholder text.
 * @param props.className - Classes on the label wrapper.
 * @param props.textareaClassName - Extra classes on the textarea.
 * @param props.persist - Session storage key suffix for client-side persistence.
 */
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
                    $deps={[$select]}
                    $args={[id, props.persist]}
                    $exec={(id, persistKey) => {
                        const textarea = $select.id(id, HTMLTextAreaElement);
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

/**
 * Labeled textarea with a clear button that appears when there is text.
 *
 * @param props.name - Form field name.
 * @param props.label - Visible label text.
 * @param props.rows - Visible row count; defaults to 4.
 * @param props.value - Current text for SSR.
 * @param props.placeholder - Placeholder text.
 * @param props.maxLength - Maximum character length.
 * @param props.className - Classes on the outer wrapper.
 * @param props.textareaClassName - Extra classes on the textarea.
 */
export function ClearableTextarea(props: {
    name: string;
    label: string;
    rows?: number;
    value?: string;
    placeholder?: string;
    maxLength?: number;
    className?: string;
    textareaClassName?: string;
}) {
    const textareaId = useId();
    const clearButtonId = useId();
    return (
        <div className={props.className}>
            <label htmlFor={textareaId} className={labelClassName}>
                {props.label}
            </label>
            <div className="relative">
                <textarea
                    id={textareaId}
                    name={props.name}
                    rows={props.rows ?? 4}
                    maxLength={props.maxLength}
                    placeholder={props.placeholder}
                    className={clsx(
                        "mt-1.5 resize-y pr-10",
                        controlClassName,
                        props.textareaClassName,
                    )}
                >
                    {props.value}
                </textarea>
                <button
                    type="button"
                    id={clearButtonId}
                    aria-label={`Clear ${props.label.toLowerCase()}`}
                    hidden={(props.value ?? "").length === 0}
                    className="absolute right-2 top-3.5 inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                    <CloseIcon className="h-4 w-4" />
                </button>
            </div>
            <Script
                $deps={[$select]}
                $args={[textareaId, clearButtonId]}
                $exec={(textareaId, clearButtonId) => {
                    const textarea = $select.id(
                        textareaId,
                        HTMLTextAreaElement,
                    );
                    const clearButton = $select.id(
                        clearButtonId,
                        HTMLButtonElement,
                    );
                    function syncClearButton() {
                        clearButton.hidden = textarea.value.length === 0;
                    }
                    clearButton.addEventListener("click", () => {
                        textarea.value = "";
                        textarea.dispatchEvent(
                            new Event("input", { bubbles: true }),
                        );
                        textarea.focus();
                    });
                    textarea.addEventListener("input", syncClearButton);
                    syncClearButton();
                }}
            />
        </div>
    );
}

/**
 * Chip-styled checkbox with an adjacent label.
 *
 * @param props.name - Form field name (shared across a group).
 * @param props.value - Submitted value when checked.
 * @param props.label - Visible label text.
 * @param props.checked - Checked state for SSR.
 * @param props.className - Extra classes on the label chip.
 * @param props.hidden - Hides the control when true.
 * @param props["data-loki-archived"] - Optional archived marker for client filters.
 */
export function Checkbox(props: {
    name: string;
    value: string;
    label: string;
    checked?: boolean;
    className?: string;
    hidden?: boolean;
    "data-loki-archived"?: string;
}) {
    return (
        <label
            className={clsx(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/60 dark:has-[:checked]:border-indigo-500 dark:has-[:checked]:bg-indigo-900/40 dark:has-[:checked]:text-indigo-200",
                props.className,
            )}
            hidden={props.hidden}
            data-loki-archived={props["data-loki-archived"]}
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

/**
 * Primary submit button plus a secondary Cancel link for standard edit forms.
 *
 * @param props.submitLabel - Label on the submit button.
 * @param props.cancelHref - Destination for the Cancel link.
 */
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
