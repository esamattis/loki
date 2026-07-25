import { useNumberFormatter } from "@/app/app";

interface JumpIssueListItem {
    key: string;
    jumpNumber: number;
    href: string;
}

export function JumpIssueList(props: {
    title: string;
    countLabel: string;
    description: string;
    items: JumpIssueListItem[];
}) {
    const formatNumber = useNumberFormatter();
    if (props.items.length === 0) {
        return null;
    }

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {props.title}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {formatNumber(props.items.length)} {props.countLabel}
                </p>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {props.description}
            </p>
            <ul className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {props.items.map((item) => (
                    <li key={item.key} className="shrink-0">
                        <a
                            href={item.href}
                            className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-medium tabular-nums text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-400 dark:hover:border-indigo-500 dark:hover:bg-slate-700 dark:focus:ring-indigo-400/40"
                        >
                            #{item.jumpNumber}
                        </a>
                    </li>
                ))}
            </ul>
        </section>
    );
}
