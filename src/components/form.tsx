import clsx from "clsx";

const labelClassName =
    "block text-sm font-medium text-slate-700 dark:text-slate-300";
const controlClassName =
    "mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30";

export function Input(props: {
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    autofocus?: boolean;
    value?: string;
    defaultValue?: string;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
}) {
    return (
        <label className={clsx(labelClassName, props.className)}>
            {props.label}
            <input
                name={props.name}
                type={props.type ?? "text"}
                required={props.required}
                autofocus={props.autofocus}
                value={props.value}
                defaultValue={props.defaultValue}
                placeholder={props.placeholder}
                className={clsx(controlClassName, props.inputClassName)}
            />
        </label>
    );
}

export function NumberInput(props: {
    id?: string;
    name: string;
    label: string;
    min?: string;
    required?: boolean;
    autofocus?: boolean;
    value?: string;
    defaultValue?: string;
    className?: string;
    inputClassName?: string;
}) {
    return (
        <label className={clsx(labelClassName, props.className)}>
            {props.label}
            <input
                id={props.id}
                name={props.name}
                type="number"
                min={props.min}
                required={props.required}
                autofocus={props.autofocus}
                value={props.value}
                defaultValue={props.defaultValue}
                className={clsx(controlClassName, props.inputClassName)}
            />
        </label>
    );
}

export function Select(props: {
    name: string;
    label: string;
    required?: boolean;
    defaultValue?: string;
    className?: string;
    selectClassName?: string;
    children: any;
}) {
    return (
        <label className={clsx(labelClassName, props.className)}>
            {props.label}
            <select
                name={props.name}
                required={props.required}
                defaultValue={props.defaultValue}
                className={clsx(
                    "appearance-none bg-no-repeat pr-10",
                    controlClassName,
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
        </label>
    );
}

export function Textarea(props: {
    name: string;
    label: string;
    rows?: number;
    defaultValue?: string;
    className?: string;
    textareaClassName?: string;
}) {
    return (
        <label className={clsx(labelClassName, props.className)}>
            {props.label}
            <textarea
                name={props.name}
                rows={props.rows ?? 4}
                className={clsx(
                    "resize-y",
                    controlClassName,
                    props.textareaClassName,
                )}
            >
                {props.defaultValue}
            </textarea>
        </label>
    );
}

export function Checkbox(props: {
    name: string;
    value: string;
    label: string;
    checked?: boolean;
    className?: string;
}) {
    return (
        <label
            className={clsx(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/60 dark:has-[:checked]:border-indigo-500 dark:has-[:checked]:bg-indigo-900/40 dark:has-[:checked]:text-indigo-200",
                props.className,
            )}
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
            <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus:ring-indigo-400/40"
            >
                {props.submitLabel}
            </button>
            <a
                href={props.cancelHref}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-indigo-400/40"
            >
                Cancel
            </a>
        </div>
    );
}
