import { useId } from "hono/jsx";
import type { App } from "@/app/app";
import { buttonClassName, controlClassName } from "@/components/form";
import { Script } from "@/components/script";
import * as routes from "@/routes";
import { $assertElement, $renderTemplate } from "@/utils";

function $initTodoApp(config: {
    emptyTemplateId: string;
    hostId: string;
    inputId: string;
    itemTemplateId: string;
    listId: string;
    templateId: string;
}) {
    const hostEl = document.getElementById(config.hostId);
    $assertElement(hostEl, HTMLDivElement);
    const host: HTMLDivElement = hostEl;
    const todos: { id: number; text: string; completed: boolean }[] = [];
    let nextId = 1;

    function render() {
        const items = document.createDocumentFragment();
        if (todos.length === 0) {
            const container = document.createElement("div");
            $renderTemplate(container, config.emptyTemplateId);
            const empty = container.firstElementChild;
            $assertElement(empty, HTMLLIElement);
            items.appendChild(empty);
        }
        for (const todo of todos) {
            const container = document.createElement("div");
            $renderTemplate(container, config.itemTemplateId, {
                text: todo.text,
            });
            const item = container.firstElementChild;
            const checkbox = item?.querySelector("[data-todo-toggle]");
            const text = item?.querySelector("[data-todo-text]");
            const remove = item?.querySelector("[data-todo-delete]");
            $assertElement(item, HTMLLIElement);
            $assertElement(checkbox, HTMLInputElement);
            $assertElement(text, HTMLSpanElement);
            $assertElement(remove, HTMLButtonElement);
            checkbox.checked = todo.completed;
            checkbox.dataset.todoToggle = String(todo.id);
            text.className = todo.completed
                ? "truncate text-slate-400 line-through"
                : "truncate text-slate-800 dark:text-slate-200";
            remove.dataset.todoDelete = String(todo.id);
            remove.setAttribute("aria-label", `Delete ${todo.text}`);
            items.appendChild(item);
        }
        const remaining = todos.filter((todo) => !todo.completed).length;
        const summary = `${remaining} ${remaining === 1 ? "task" : "tasks"} remaining`;
        $renderTemplate(host, config.templateId, { items, summary });
    }

    render();
    const inputEl = document.getElementById(config.inputId);
    const listEl = document.getElementById(config.listId);
    const addEl = host.querySelector("[data-add-todo]");
    $assertElement(inputEl, HTMLInputElement);
    $assertElement(listEl, HTMLUListElement);
    $assertElement(addEl, HTMLButtonElement);
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
        const id = Number(target.dataset.todoToggle);
        const todo = todos.find((item) => item.id === id);
        if (!todo) return;
        todo.completed = target.checked;
        render();
    });
    list.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const button = target.closest("[data-todo-delete]");
        if (!(button instanceof HTMLButtonElement)) return;
        const id = Number(button.dataset.todoDelete);
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
                            data-add-todo
                            className={buttonClassName({})}
                        >
                            Add
                        </button>
                    </div>
                    <p
                        data-template-slot="summary"
                        aria-live="polite"
                        className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400"
                    ></p>
                    <ul
                        id={listId}
                        data-template-slot="items"
                        className="mt-2"
                    ></ul>
                </section>
            </template>
            <template id={itemTemplateId}>
                <li className="flex items-center gap-3 border-t border-slate-200 py-3 first:border-t-0 dark:border-slate-700">
                    <label className="flex min-w-0 flex-1 items-center gap-3">
                        <input
                            type="checkbox"
                            data-todo-toggle
                            className="size-4 rounded border-slate-300"
                        />
                        <span data-todo-text data-template-slot="text"></span>
                    </label>
                    <button
                        type="button"
                        data-todo-delete
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
                $deps={[$renderTemplate, $assertElement]}
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
