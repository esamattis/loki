import clsx from "clsx";
import { useId } from "hono/jsx";
import { controlClassName } from "@/components/form";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { Script } from "@/components/script";
import { $select } from "@/utils";

export function Password(props: {
    name: string;
    label: string;
    placeholder?: string;
    required?: boolean;
    autofocus?: boolean;
    value?: string;
    className?: string;
}) {
    const id = useId();
    const toggleId = `${id}-password-toggle`;
    const eyeIconId = `${id}-eye-icon`;
    const eyeOffIconId = `${id}-eye-off-icon`;
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
                {props.label}
            </label>
            <div className="relative">
                <input
                    type="password"
                    autofocus={props.autofocus}
                    id={id}
                    name={props.name}
                    required={props.required}
                    value={props.value}
                    className={clsx(
                        controlClassName,
                        "pr-12 text-base sm:py-2",
                        props.className,
                    )}
                    placeholder={props.placeholder}
                    autocomplete="off"
                />
                <button
                    type="button"
                    id={toggleId}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-lg text-slate-400 transition hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:text-slate-500 dark:hover:text-slate-300 dark:focus:ring-indigo-400/40"
                    aria-label="Show/hide password"
                >
                    <EyeIcon id={eyeIconId} className="h-5 w-5" />
                    <EyeOffIcon id={eyeOffIconId} className="hidden h-5 w-5" />
                </button>
            </div>
            <Script
                $deps={[$select]}
                $args={[{ inputId: id, toggleId, eyeIconId, eyeOffIconId }]}
                $exec={(ids) => {
                    function togglePasswordVisibility() {
                        const input = $select.id(ids.inputId, HTMLInputElement);
                        const eyeIcon = $select.id(
                            ids.eyeIconId,
                            SVGSVGElement,
                        );
                        const eyeOffIcon = $select.id(
                            ids.eyeOffIconId,
                            SVGSVGElement,
                        );
                        if (input.type === "password") {
                            input.type = "text";
                            eyeIcon.classList.add("hidden");
                            eyeOffIcon.classList.remove("hidden");
                        } else {
                            input.type = "password";
                            eyeIcon.classList.remove("hidden");
                            eyeOffIcon.classList.add("hidden");
                        }
                        input.focus();
                    }
                    const toggleButton = $select.id(
                        ids.toggleId,
                        HTMLButtonElement,
                    );
                    toggleButton.addEventListener(
                        "click",
                        togglePasswordVisibility,
                    );
                }}
            />
        </div>
    );
}

export function TextInput(props: {
    name: string;
    label: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
    autofocus?: boolean;
    value?: string;
    className?: string;
}) {
    const id = useId();
    return (
        <div className={props.className}>
            <label
                htmlFor={id}
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
                {props.label}
            </label>
            <input
                type={props.type || "text"}
                autofocus={props.autofocus}
                id={id}
                name={props.name}
                required={props.required}
                value={props.value}
                className={clsx(controlClassName, "text-base sm:py-2")}
                placeholder={props.placeholder}
            />
        </div>
    );
}
