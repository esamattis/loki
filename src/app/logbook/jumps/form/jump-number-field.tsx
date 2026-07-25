import { useId, type Child } from "hono/jsx";
import {
    Button,
    controlClassName,
    NumberInput,
    Select,
} from "@/components/form";
import { ErrorList } from "@/components/feedback";
import { Link } from "@/components/link";
import { Script } from "@/components/script";
import {
    JUMP_NUMBER_CONFLICT_REPLACE,
    JUMP_NUMBER_CONFLICT_SHIFT,
    type JumpNumberConflictAction,
} from "@/route-handlers/logbook/jumps/helpers";
import * as routes from "@/routes";
import { $select } from "@/utils";

export function JumpNumberError(props: {
    error?: Child;
    conflict?: {
        jumpNumber: number;
        existingUuid: string;
        selected?: JumpNumberConflictAction;
    };
}) {
    if (!props.conflict && !props.error) {
        return null;
    }
    return (
        <div className="mt-2 space-y-2">
            {props.error ? (
                <ErrorList
                    errors={[props.error]}
                    className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
                />
            ) : null}
            {props.conflict ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                    <p className="text-sm">
                        Jump #{props.conflict.jumpNumber} already exists.{" "}
                        <Link
                            href={routes.logbook.jumps.edit({
                                uuid: props.conflict.existingUuid,
                            })}
                        >
                            Open existing jump
                        </Link>
                    </p>
                    <div className="mt-2">
                        <Select
                            name="jumpNumberConflict"
                            label="How to handle this"
                        >
                            <option
                                value=""
                                selected={!props.conflict.selected}
                            >
                                Choose an option
                            </option>
                            <option
                                value={JUMP_NUMBER_CONFLICT_REPLACE}
                                selected={
                                    props.conflict.selected ===
                                    JUMP_NUMBER_CONFLICT_REPLACE
                                }
                            >
                                Replace existing jump
                            </option>
                            <option
                                value={JUMP_NUMBER_CONFLICT_SHIFT}
                                selected={
                                    props.conflict.selected ===
                                    JUMP_NUMBER_CONFLICT_SHIFT
                                }
                            >
                                Shift existing and later jumps by +1
                            </option>
                        </Select>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export function JumpNumberField(props: {
    value: string;
    nextJumpNumber?: string;
    error?: Child;
    conflict?: {
        jumpNumber: number;
        existingUuid: string;
        selected?: JumpNumberConflictAction;
    };
    excludeJumpUuid?: string;
}) {
    const inputId = useId();
    const buttonId = useId();
    const errorId = useId();

    if (props.nextJumpNumber === undefined && !props.excludeJumpUuid) {
        return (
            <div>
                <NumberInput
                    name="jumpNumber"
                    label="Jump number"
                    min="1"
                    required
                    value={props.value}
                />
                {(props.error || props.conflict) && (
                    <div className="mt-2">
                        <JumpNumberError
                            error={props.error}
                            conflict={props.conflict}
                        />
                    </div>
                )}
            </div>
        );
    }

    const errorQuery =
        props.excludeJumpUuid === undefined
            ? {}
            : { excludeJumpUuid: props.excludeJumpUuid };

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
                    hx-get={routes.logbook.jumps.jumpNumberError(
                        {},
                        errorQuery,
                    )}
                    hx-trigger="input changed delay:300ms, blur"
                    hx-target={`[id='${errorId}']`}
                    hx-swap="innerHTML"
                    hx-sync="this:replace"
                    className={controlClassName}
                />
                {props.nextJumpNumber !== undefined ? (
                    <Button
                        id={buttonId}
                        type="button"
                        variant="secondary"
                        data-loki-tooltip="Set number to the next jump number. Ie. latest jump number + 1"
                        className="shrink-0 px-3.5 py-2.5 text-sm"
                    >
                        Next
                    </Button>
                ) : null}
            </div>
            <div id={errorId} aria-live="polite">
                <JumpNumberError
                    error={props.error}
                    conflict={props.conflict}
                />
            </div>
            {props.nextJumpNumber !== undefined ? (
                <Script
                    $deps={[$select]}
                    $args={[inputId, buttonId]}
                    $exec={(inputId, buttonId) => {
                        const input = $select.id(inputId, HTMLInputElement);
                        const button = $select.id(buttonId, HTMLButtonElement);
                        button.addEventListener("click", () => {
                            input.value =
                                input.getAttribute(
                                    "data-loki-next-jump-number",
                                ) ?? "";
                            input.dispatchEvent(
                                new Event("input", { bubbles: true }),
                            );
                        });
                    }}
                />
            ) : null}
        </div>
    );
}
