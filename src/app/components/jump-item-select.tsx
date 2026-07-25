/**
 * Reusable SSR jump-item selector for both single- and multiple-value fields.
 * The collapsed control shows only selected items, while its dialog contains
 * the actual radio buttons or checkboxes submitted with the surrounding form.
 * Active and archived resources are rendered in separate sections; archived
 * resources stay hidden unless revealed or already selected. A small browser
 * script keeps the collapsed summary and archive visibility in sync as inputs
 * change. Resource descriptions are exposed through the shared tooltip system.
 */
import clsx from "clsx";
import { useId, type Child } from "hono/jsx";
import { Button } from "@/components/form";
import { Script } from "@/components/script";
import { Dialog } from "@/components/ui/dialog";
import { $renderTemplate, $select } from "@/utils";

export interface JumpItemResource {
    uuid: string;
    name: string;
    archived: boolean;
    description: string | null;
}

const OPTION_CLASS_NAME =
    "flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/60 dark:has-[:checked]:border-indigo-500 dark:has-[:checked]:bg-indigo-900/40 dark:has-[:checked]:text-indigo-200";

function JumpItemOption(props: {
    item: JumpItemResource;
    name: string;
    selected: boolean;
    multiple?: boolean;
}) {
    return (
        <label
            hidden={props.item.archived && !props.selected}
            data-loki-archived={props.item.archived ? "true" : undefined}
            data-loki-tooltip={props.item.description || undefined}
            className={OPTION_CLASS_NAME}
        >
            <input
                name={props.name}
                type={props.multiple ? "checkbox" : "radio"}
                value={props.item.uuid}
                checked={props.selected}
                data-loki-jump-item-input
                data-loki-label={props.item.name}
                data-loki-description={props.item.description || undefined}
                className={clsx(
                    "h-4 w-4 border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-600 dark:text-indigo-500 dark:focus:ring-indigo-400/40",
                    props.multiple && "rounded",
                )}
            />
            {props.item.name}
        </label>
    );
}

function JumpItemArchiveScript(props: {
    optionsId: string;
    archivedButtonId: string;
}) {
    if (props.archivedButtonId === "") return null;
    return (
        <Script
            $deps={[$select]}
            $args={[props]}
            $exec={(config) => {
                const options = $select.id(config.optionsId, HTMLDivElement);
                const button = $select.id(
                    config.archivedButtonId,
                    HTMLButtonElement,
                );

                function setArchivedItemsVisible(visible: boolean) {
                    let hasSelectedArchivedItem = false;
                    for (const element of $select.all(
                        '[data-loki-archived="true"]',
                        HTMLLabelElement,
                        options,
                    )) {
                        const input = $select.el(
                            "input",
                            HTMLInputElement,
                            element,
                        );
                        hasSelectedArchivedItem ||= input.checked;
                        element.hidden = !(visible || input.checked);
                    }
                    const archivedSection = $select.elOrNull(
                        "[data-loki-archived-section]",
                        HTMLElement,
                        options,
                    );
                    if (archivedSection) {
                        archivedSection.hidden = !(
                            visible || hasSelectedArchivedItem
                        );
                    }
                    button.dataset.lokiShowingArchived = visible
                        ? "true"
                        : "false";
                    button.textContent = visible
                        ? "Hide archived items"
                        : "Show archived items";
                }

                options.addEventListener("change", () => {
                    setArchivedItemsVisible(
                        button.dataset.lokiShowingArchived === "true",
                    );
                });
                button.addEventListener("click", () => {
                    setArchivedItemsVisible(
                        button.dataset.lokiShowingArchived !== "true",
                    );
                });
            }}
        />
    );
}

function JumpItemSelectScript(props: {
    optionsId: string;
    summaryId: string;
    archivedButtonId: string;
    clearButtonId: string;
    emptyText: string;
    emptyTemplateId: string;
    itemTemplateId: string;
}) {
    return (
        <>
            <template id={props.emptyTemplateId}>
                <span
                    data-loki-template-slot="emptyText"
                    class="text-slate-500 dark:text-slate-400"
                ></span>
            </template>
            <template id={props.itemTemplateId}>
                <span
                    data-loki-template-slot="label"
                    class="rounded-md bg-indigo-50 px-2 py-1 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-200"
                ></span>
            </template>
            <Script
                $deps={[$select, $renderTemplate]}
                $args={[props]}
                $exec={(config) => {
                    const optionsEl = $select.id(
                        config.optionsId,
                        HTMLDivElement,
                    );
                    const summaryEl = $select.id(
                        config.summaryId,
                        HTMLDivElement,
                    );
                    const options: HTMLDivElement = optionsEl;
                    const summary: HTMLDivElement = summaryEl;

                    function selectedInputs() {
                        return Array.from(
                            $select.all(
                                "[data-loki-jump-item-input]",
                                HTMLInputElement,
                                options,
                            ),
                        ).filter(
                            (element) =>
                                element.checked && element.value !== "",
                        );
                    }

                    function updateSummary() {
                        const selected = selectedInputs();
                        if (config.clearButtonId !== "") {
                            const clearButton = $select.id(
                                config.clearButtonId,
                                HTMLButtonElement,
                            );
                            clearButton.disabled = selected.length === 0;
                        }
                        if (selected.length === 0) {
                            $renderTemplate(summary, config.emptyTemplateId, {
                                emptyText: config.emptyText,
                            });
                            return;
                        }
                        summary.replaceChildren(
                            ...selected.map((input) => {
                                const container = document.createElement("div");
                                $renderTemplate(
                                    container,
                                    config.itemTemplateId,
                                    {
                                        label:
                                            input.getAttribute(
                                                "data-loki-label",
                                            ) ?? "",
                                    },
                                );
                                const item = $select.el(
                                    ":scope > *",
                                    HTMLElement,
                                    container,
                                );
                                const description = input.getAttribute(
                                    "data-loki-description",
                                );
                                if (description)
                                    item.dataset.lokiTooltip = description;
                                return item;
                            }),
                        );
                    }

                    options.addEventListener("change", () => {
                        updateSummary();
                    });
                    if (config.clearButtonId !== "") {
                        const clearButton = $select.id(
                            config.clearButtonId,
                            HTMLButtonElement,
                        );
                        clearButton.addEventListener("click", () => {
                            const selected = selectedInputs();
                            for (const input of selected) {
                                input.checked = false;
                            }
                            for (const input of selected) {
                                input.dispatchEvent(
                                    new Event("input", { bubbles: true }),
                                );
                                input.dispatchEvent(
                                    new Event("change", { bubbles: true }),
                                );
                            }
                        });
                    }
                }}
            />
            <JumpItemArchiveScript
                optionsId={props.optionsId}
                archivedButtonId={props.archivedButtonId}
            />
        </>
    );
}

interface JumpItemSelectProps {
    label: string;
    dialogTitle: string;
    name: string;
    items: JumpItemResource[];
    selectedUuids: Set<string>;
    multiple?: boolean;
    description?: Child;
    className?: string;
}

function JumpItemSelectFooter(props: {
    multiple?: boolean;
    hasSelection: boolean;
    clearButtonId: string;
    archivedButtonId: string;
    hasArchivedItems: boolean;
}) {
    return (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="flex items-center gap-3">
                {props.multiple && (
                    <button
                        id={props.clearButtonId}
                        type="button"
                        disabled={!props.hasSelection}
                        className="text-sm font-medium text-indigo-600 transition hover:text-indigo-500 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-indigo-400 dark:hover:text-indigo-300 dark:disabled:text-slate-600"
                    >
                        Clear all
                    </button>
                )}
                {props.hasArchivedItems && (
                    <button
                        id={props.archivedButtonId}
                        type="button"
                        data-loki-showing-archived="false"
                        className="text-sm font-medium text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                        Show archived items
                    </button>
                )}
            </div>
            <Button type="button" value="cancel" size="sm">
                OK
            </Button>
        </div>
    );
}

export function JumpItemSelect(props: JumpItemSelectProps) {
    function isSelected(item: JumpItemResource) {
        return props.selectedUuids.has(item.uuid);
    }

    const buttonId = useId();
    const dialogId = useId();
    const optionsId = useId();
    const summaryId = useId();
    const archivedButtonId = useId();
    const clearButtonId = useId();
    const emptyTemplateId = useId();
    const itemTemplateId = useId();
    const selectedItems = props.items.filter(isSelected);
    const activeItems = props.items.filter((item) => !item.archived);
    const archivedItems = props.items.filter((item) => item.archived);
    const hasSelectedArchivedItems = archivedItems.some(isSelected);
    const emptyText = "None selected";

    return (
        <fieldset className={props.className}>
            <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {props.label}
            </legend>
            <button
                id={buttonId}
                type="button"
                aria-controls={dialogId}
                aria-label={props.dialogTitle}
                className="mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-left text-sm shadow-sm transition hover:border-indigo-400 hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-indigo-500 dark:hover:bg-slate-700"
            >
                <div
                    id={summaryId}
                    aria-live="polite"
                    className="flex flex-wrap gap-1.5"
                >
                    {selectedItems.length === 0 ? (
                        <span className="text-slate-500 dark:text-slate-400">
                            {emptyText}
                        </span>
                    ) : (
                        selectedItems.map((item) => (
                            <span
                                data-loki-tooltip={
                                    item.description || undefined
                                }
                                className="rounded-md bg-indigo-50 px-2 py-1 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-200"
                            >
                                {item.name}
                            </span>
                        ))
                    )}
                </div>
            </button>
            <Dialog
                id={dialogId}
                openButtonId={buttonId}
                title={props.dialogTitle}
                className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-hidden"
                contentClassName="flex max-h-[calc(100dvh-2rem)] flex-col"
            >
                {props.description}
                <div
                    id={optionsId}
                    className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1"
                >
                    <section>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Available
                        </h3>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {activeItems.length === 0 &&
                            selectedItems.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    No {props.label.toLowerCase()} available.
                                </p>
                            ) : !props.multiple ? (
                                <label className={OPTION_CLASS_NAME}>
                                    <input
                                        name={props.name}
                                        type="radio"
                                        value=""
                                        checked={selectedItems.length === 0}
                                        data-loki-jump-item-input
                                        className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-600 dark:text-indigo-500 dark:focus:ring-indigo-400/40"
                                    />
                                    None
                                </label>
                            ) : null}
                            {activeItems.map((item) => (
                                <JumpItemOption
                                    item={item}
                                    name={props.name}
                                    selected={isSelected(item)}
                                    multiple={props.multiple}
                                />
                            ))}
                        </div>
                    </section>
                    {archivedItems.length > 0 && (
                        <section
                            hidden={!hasSelectedArchivedItems}
                            data-loki-archived-section
                            className="border-t border-slate-200 pt-4 dark:border-slate-700"
                        >
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Archived
                            </h3>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {archivedItems.map((item) => (
                                    <JumpItemOption
                                        item={item}
                                        name={props.name}
                                        selected={isSelected(item)}
                                        multiple={props.multiple}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
                <JumpItemSelectFooter
                    multiple={props.multiple}
                    hasSelection={selectedItems.length > 0}
                    clearButtonId={clearButtonId}
                    archivedButtonId={archivedButtonId}
                    hasArchivedItems={archivedItems.length > 0}
                />
            </Dialog>
            <JumpItemSelectScript
                optionsId={optionsId}
                summaryId={summaryId}
                archivedButtonId={
                    archivedItems.length > 0 ? archivedButtonId : ""
                }
                clearButtonId={props.multiple ? clearButtonId : ""}
                emptyText={emptyText}
                emptyTemplateId={emptyTemplateId}
                itemTemplateId={itemTemplateId}
            />
        </fieldset>
    );
}
