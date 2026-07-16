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
import { $assertElement, $renderTemplate } from "@/utils";

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
            data-archived={props.item.archived ? "true" : undefined}
            data-tooltip={props.item.description || undefined}
            className={OPTION_CLASS_NAME}
        >
            <input
                name={props.name}
                type={props.multiple ? "checkbox" : "radio"}
                value={props.item.uuid}
                checked={props.selected}
                data-jump-item-input
                data-label={props.item.name}
                data-description={props.item.description || undefined}
                className={clsx(
                    "h-4 w-4 border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-600 dark:text-indigo-500 dark:focus:ring-indigo-400/40",
                    props.multiple && "rounded",
                )}
            />
            {props.item.name}
        </label>
    );
}

function JumpItemSelectScript(props: {
    optionsId: string;
    summaryId: string;
    archivedButtonId: string;
    emptyText: string;
    emptyTemplateId: string;
    itemTemplateId: string;
}) {
    return (
        <>
            <template id={props.emptyTemplateId}>
                <span
                    data-template-slot="emptyText"
                    class="text-slate-500 dark:text-slate-400"
                ></span>
            </template>
            <template id={props.itemTemplateId}>
                <span
                    data-template-slot="label"
                    class="rounded-md bg-indigo-50 px-2 py-1 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-200"
                ></span>
            </template>
            <Script
                $deps={[$renderTemplate, $assertElement]}
                $args={[props]}
                $exec={(config) => {
                    const optionsEl = document.getElementById(config.optionsId);
                    const summaryEl = document.getElementById(config.summaryId);
                    $assertElement(optionsEl, HTMLDivElement);
                    $assertElement(summaryEl, HTMLDivElement);
                    const options: HTMLDivElement = optionsEl;
                    const summary: HTMLDivElement = summaryEl;

                    function selectedInputs() {
                        return Array.from(
                            options.querySelectorAll("[data-jump-item-input]"),
                        ).filter(
                            (element) =>
                                element instanceof HTMLInputElement &&
                                element.checked &&
                                element.value !== "",
                        );
                    }

                    function updateSummary() {
                        const selected = selectedInputs();
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
                                            input.getAttribute("data-label") ??
                                            "",
                                    },
                                );
                                const item = container.firstElementChild;
                                $assertElement(item, HTMLElement);
                                const description =
                                    input.getAttribute("data-description");
                                if (description)
                                    item.dataset.tooltip = description;
                                return item;
                            }),
                        );
                    }

                    function setArchivedItemsVisible(visible: boolean) {
                        let hasSelectedArchivedItem = false;
                        for (const element of options.querySelectorAll(
                            '[data-archived="true"]',
                        )) {
                            if (!(element instanceof HTMLLabelElement))
                                continue;
                            const input = element.querySelector("input");
                            const selected =
                                input instanceof HTMLInputElement &&
                                input.checked;
                            hasSelectedArchivedItem ||= selected;
                            element.hidden = !(visible || selected);
                        }
                        const archivedSection = options.querySelector(
                            "[data-archived-section]",
                        );
                        if (archivedSection instanceof HTMLElement) {
                            archivedSection.hidden = !(
                                visible || hasSelectedArchivedItem
                            );
                        }
                        if (config.archivedButtonId === "") return;
                        const button = document.getElementById(
                            config.archivedButtonId,
                        );
                        $assertElement(button, HTMLButtonElement);
                        button.dataset.showingArchived = visible
                            ? "true"
                            : "false";
                        button.textContent = visible
                            ? "Hide archived items"
                            : "Show archived items";
                    }

                    options.addEventListener("change", () => {
                        updateSummary();
                        if (config.archivedButtonId === "") return;
                        const button = document.getElementById(
                            config.archivedButtonId,
                        );
                        $assertElement(button, HTMLButtonElement);
                        setArchivedItemsVisible(
                            button.dataset.showingArchived === "true",
                        );
                    });
                    if (config.archivedButtonId !== "") {
                        const button = document.getElementById(
                            config.archivedButtonId,
                        );
                        $assertElement(button, HTMLButtonElement);
                        button.addEventListener("click", () => {
                            setArchivedItemsVisible(
                                button.dataset.showingArchived !== "true",
                            );
                        });
                    }
                }}
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

export function JumpItemSelect(props: JumpItemSelectProps) {
    function isSelected(item: JumpItemResource) {
        return props.selectedUuids.has(item.uuid);
    }

    const buttonId = useId();
    const dialogId = useId();
    const optionsId = useId();
    const summaryId = useId();
    const archivedButtonId = useId();
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
                                data-tooltip={item.description || undefined}
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
                                        data-jump-item-input
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
                            data-archived-section
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
                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                    {archivedItems.length > 0 ? (
                        <button
                            id={archivedButtonId}
                            type="button"
                            data-showing-archived="false"
                            className="text-sm font-medium text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                            Show archived items
                        </button>
                    ) : (
                        <span />
                    )}
                    <Button type="button" value="cancel" size="sm">
                        OK
                    </Button>
                </div>
            </Dialog>
            <JumpItemSelectScript
                optionsId={optionsId}
                summaryId={summaryId}
                archivedButtonId={
                    archivedItems.length > 0 ? archivedButtonId : ""
                }
                emptyText={emptyText}
                emptyTemplateId={emptyTemplateId}
                itemTemplateId={itemTemplateId}
            />
        </fieldset>
    );
}
