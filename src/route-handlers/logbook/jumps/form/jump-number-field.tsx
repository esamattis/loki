import { useId, type Child } from "hono/jsx";
import { Button, controlClassName, NumberInput } from "@/components/form";
import { ErrorList } from "@/components/feedback";
import { Script } from "@/components/script";
import * as routes from "@/routes";
import { $select } from "@/utils";

export function JumpNumberError(props: { error?: Child }) {
    return (
        <ErrorList
            errors={props.error ? [props.error] : []}
            className="mt-2 border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        />
    );
}

export function JumpNumberField(props: {
    value: string;
    nextJumpNumber?: string;
    error?: Child;
}) {
    const inputId = useId();
    const buttonId = useId();
    const errorId = useId();

    if (props.nextJumpNumber === undefined) {
        return (
            <NumberInput
                name="jumpNumber"
                label="Jump number"
                min="1"
                required
                value={props.value}
            />
        );
    }

    return (
        <div>
            <label
                htmlFor={inputId}
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
                Jump number
            </label>
            <div className="mt-1.5 flex gap-2">
                <input
                    id={inputId}
                    name="jumpNumber"
                    type="number"
                    min="1"
                    required
                    value={props.value}
                    data-loki-next-jump-number={props.nextJumpNumber}
                    aria-describedby={errorId}
                    hx-get={routes.logbook.jumps.jumpNumberError({}, {})}
                    hx-trigger="input changed delay:300ms"
                    hx-target={`[id='${errorId}']`}
                    hx-swap="innerHTML"
                    hx-sync="this:replace"
                    className={controlClassName}
                />
                <Button
                    id={buttonId}
                    type="button"
                    variant="secondary"
                    data-loki-tooltip="Set number to the next jump number. Ie. latest jump number + 1"
                    className="shrink-0 px-3.5 py-2.5 text-sm"
                >
                    Next
                </Button>
            </div>
            <div id={errorId} aria-live="polite">
                <JumpNumberError error={props.error} />
            </div>
            <Script
                $deps={[$select]}
                $args={[inputId, buttonId]}
                $exec={(inputId, buttonId) => {
                    const input = $select.id(inputId, HTMLInputElement);
                    const button = $select.id(buttonId, HTMLButtonElement);
                    button.addEventListener("click", () => {
                        input.value =
                            input.getAttribute("data-loki-next-jump-number") ??
                            "";
                        input.dispatchEvent(
                            new Event("input", { bubbles: true }),
                        );
                    });
                }}
            />
        </div>
    );
}
