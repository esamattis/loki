import { useId } from "hono/jsx";
import type { App } from "@/app/app";
import { buttonClassName, controlClassName } from "@/components/form";
import { Script } from "@/components/script";
import * as routes from "@/routes";
import { $el, $elAll, $elById, $renderTemplate } from "@/utils";

function $initTodoApp(config: {
    emptyTemplateId: string;
    hostId: string;
    inputId: string;
    itemTemplateId: string;
    listId: string;
    templateId: string;
}) {
    const hostEl = $elById(config.hostId, HTMLDivElement);
    const host: HTMLDivElement = hostEl;
    const todos: { id: number; text: string; completed: boolean }[] = [];
    let nextId = 1;

    function render() {
        const items = document.createDocumentFragment();
        if (todos.length === 0) {
            const container = document.createElement("div");
            $renderTemplate(container, config.emptyTemplateId);
            const empty = $el(":scope > *", HTMLLIElement, container);
            items.appendChild(empty);
        }
        for (const todo of todos) {
            const container = document.createElement("div");
            $renderTemplate(container, config.itemTemplateId, {
                text: todo.text,
            });
            const item = $el(":scope > *", HTMLLIElement, container);
            const checkbox = $el(
                "[data-loki-todo-toggle]",
                HTMLInputElement,
                item,
            );
            const text = $el("[data-loki-todo-text]", HTMLSpanElement, item);
            const remove = $el(
                "[data-loki-todo-delete]",
                HTMLButtonElement,
                item,
            );
            checkbox.checked = todo.completed;
            checkbox.dataset.lokiTodoToggle = String(todo.id);
            text.className = todo.completed
                ? "truncate text-slate-400 line-through"
                : "truncate text-slate-800 dark:text-slate-200";
            remove.dataset.lokiTodoDelete = String(todo.id);
            remove.setAttribute("aria-label", `Delete ${todo.text}`);
            items.appendChild(item);
        }
        const remaining = todos.filter((todo) => !todo.completed).length;
        const summary = `${remaining} ${remaining === 1 ? "task" : "tasks"} remaining`;
        $renderTemplate(host, config.templateId, { items, summary });
    }

    render();
    const inputEl = $elById(config.inputId, HTMLInputElement);
    const listEl = $elById(config.listId, HTMLUListElement);
    const addEl = $el("[data-loki-add-todo]", HTMLButtonElement, host);
    const input: HTMLInputElement = inputEl;
    const list: HTMLUListElement = listEl;
    const add: HTMLButtonElement = addEl;

    function addTodo() {
        const text = input.value.trim();
        if (!text) return;
        todos.push({ id: nextId++, text, completed: false });
        input.value = "";
        render();
        input.focus();
    }

    add.addEventListener("click", addTodo);
    input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        addTodo();
    });
    list.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        const id = Number(target.dataset.lokiTodoToggle);
        const todo = todos.find((item) => item.id === id);
        if (!todo) return;
        todo.completed = target.checked;
        render();
    });
    list.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const button = target.closest("[data-loki-todo-delete]");
        if (!(button instanceof HTMLButtonElement)) return;
        const id = Number(button.dataset.lokiTodoDelete);
        const index = todos.findIndex((item) => item.id === id);
        if (index === -1) return;
        todos.splice(index, 1);
        render();
    });
}

function TodoPage() {
    const emptyTemplateId = useId();
    const hostId = useId();
    const inputId = useId();
    const itemTemplateId = useId();
    const listId = useId();
    const templateId = useId();
    return (
        <main className="mx-auto min-h-screen max-w-xl px-4 py-12 sm:py-20">
            <div className="mb-8 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                    Small steps
                </p>
                <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Todo list
                </h1>
            </div>
            <div id={hostId}></div>
            <template id={templateId}>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
                    <div className="flex gap-2">
                        <label className="sr-only" for={inputId}>
                            New task
                        </label>
                        <input
                            id={inputId}
                            className={controlClassName}
                            placeholder="What needs doing?"
                            autocomplete="off"
                        />
                        <button
                            type="button"
                            data-loki-add-todo
                            className={buttonClassName({})}
                        >
                            Add
                        </button>
                    </div>
                    <p
                        data-loki-template-slot="summary"
                        aria-live="polite"
                        className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400"
                    ></p>
                    <ul
                        id={listId}
                        data-loki-template-slot="items"
                        className="mt-2"
                    ></ul>
                </section>
            </template>
            <template id={itemTemplateId}>
                <li className="flex items-center gap-3 border-t border-slate-200 py-3 first:border-t-0 dark:border-slate-700">
                    <label className="flex min-w-0 flex-1 items-center gap-3">
                        <input
                            type="checkbox"
                            data-loki-todo-toggle
                            className="size-4 rounded border-slate-300"
                        />
                        <span
                            data-loki-todo-text
                            data-loki-template-slot="text"
                        ></span>
                    </label>
                    <button
                        type="button"
                        data-loki-todo-delete
                        className="rounded-md px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                        Delete
                    </button>
                </li>
            </template>
            <template id={emptyTemplateId}>
                <li className="py-6 text-center text-sm text-slate-500">
                    No tasks yet.
                </li>
            </template>
            <Script
                $deps={[$el, $elAll, $elById, $renderTemplate]}
                $args={[
                    {
                        emptyTemplateId,
                        hostId,
                        inputId,
                        itemTemplateId,
                        listId,
                        templateId,
                    },
                ]}
                $exec={$initTodoApp}
            />
        </main>
    );
}

export function register(app: App) {
    app.get(routes.todo.route, (c) => c.render(<TodoPage />));
}
