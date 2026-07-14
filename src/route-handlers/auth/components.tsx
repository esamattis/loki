import clsx from "clsx";
import { useId } from "hono/jsx";
import { controlClassName } from "@/components/form";
import { Script } from "@/components/script";
import { $assertElement } from "@/utils";

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
                    id={`togglePassword-${id}`}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-lg text-slate-400 transition hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:text-slate-500 dark:hover:text-slate-300 dark:focus:ring-indigo-400/40"
                    aria-label="Show/hide password"
                >
                    <span id={`eyeIcon-${id}`}>👁️</span>
                </button>
            </div>
            <Script
                $deps={[$assertElement]}
                $args={[id]}
                $exec={(inputId) => {
                    function togglePasswordVisibility() {
                        const input = document.getElementById(inputId);
                        $assertElement(input, HTMLInputElement);
                        const eyeIcon = document.getElementById(
                            `eyeIcon-${inputId}`,
                        );
                        $assertElement(eyeIcon, HTMLElement);
                        if (input.type === "password") {
                            input.type = "text";
                            eyeIcon.textContent = "🙈";
                        } else {
                            input.type = "password";
                            eyeIcon.textContent = "👁️";
                        }
                        input.focus();
                    }
                    const toggleButton = document.getElementById(
                        `togglePassword-${inputId}`,
                    );
                    if (toggleButton) {
                        toggleButton.addEventListener(
                            "click",
                            togglePasswordVisibility,
                        );
                    }
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
