import clsx from "clsx";
import { useId } from "hono/jsx";
import { $assertElement } from "@/utils";
import { buttonClassName } from "@/components/form";
import { Script } from "@/components/script";

const dangerButtonClassName = buttonClassName({
    variant: "secondary",
    className:
        "border-red-300 text-red-600 hover:bg-red-50 focus:ring-red-500/40 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40 dark:focus:ring-red-400/40",
});
const confirmDangerCountdownSeconds =
    process.env.PLAYWRIGHT_TEST === "1" ? 0 : 3;

function $initConfirmDangerButton(
    buttonId: string,
    label: string,
    confirmLabel: string,
    countdownSeconds: number,
) {
    const button = document.getElementById(buttonId);
    $assertElement(button, HTMLButtonElement);
    const buttonElement = button;
    let state: "idle" | "ready" = "idle";
    let timer: ReturnType<typeof setInterval> | null = null;
    function clearTimer() {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    }
    function reset() {
        if (state === "idle") return;
        clearTimer();
        state = "idle";
        buttonElement.disabled = false;
        buttonElement.classList.remove(
            "opacity-50",
            "cursor-not-allowed",
            "border-red-500",
            "bg-red-100",
            "dark:bg-red-950/60",
        );
        buttonElement.textContent = label;
    }
    function onOutsideClick(event: MouseEvent) {
        const target = event.target;
        if (target instanceof Node && buttonElement.contains(target)) return;
        reset();
    }
    function armReady() {
        buttonElement.disabled = false;
        buttonElement.classList.remove("opacity-50", "cursor-not-allowed");
        buttonElement.classList.add(
            "border-red-500",
            "bg-red-100",
            "dark:bg-red-950/60",
        );
        buttonElement.textContent = confirmLabel;
        setTimeout(() => {
            if (state === "ready")
                document.addEventListener("click", onOutsideClick, {
                    once: true,
                });
        }, 0);
    }
    button.addEventListener("click", (event) => {
        if (state === "ready") return;
        event.preventDefault();
        state = "ready";
        if (countdownSeconds <= 0) {
            armReady();
            return;
        }
        buttonElement.disabled = true;
        buttonElement.classList.add(
            "opacity-50",
            "cursor-not-allowed",
            "border-red-500",
            "bg-red-100",
            "dark:bg-red-950/60",
        );
        let count = countdownSeconds;
        buttonElement.textContent = `${confirmLabel} (${count}s)`;
        timer = setInterval(() => {
            count -= 1;
            if (count <= 0) {
                clearTimer();
                armReady();
                return;
            }
            buttonElement.textContent = `${confirmLabel} (${count}s)`;
        }, 1000);
    });
}

function ConfirmDangerButtonScript(props: {
    buttonId: string;
    label: string;
    confirmLabel: string;
}) {
    return (
        <Script
            $deps={[$assertElement]}
            $args={[
                props.buttonId,
                props.label,
                props.confirmLabel,
                confirmDangerCountdownSeconds,
            ]}
            $exec={$initConfirmDangerButton}
        />
    );
}

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
            <ConfirmDangerButtonScript
                buttonId={buttonId}
                label={props.label}
                confirmLabel={props.confirmLabel}
            />
        </>
    );
}
