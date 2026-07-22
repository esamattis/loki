export function JumpItemCounts(props: {
    previousLabel: string;
    previousCount: number;
    recordedCount: number;
}) {
    return (
        <dl className="mt-4 grid grid-cols-2 gap-2">
            <div
                className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60"
                aria-label={`${props.previousLabel}: ${props.previousCount}`}
            >
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {props.previousLabel}
                </dt>
                <dd className="mt-0.5 text-lg font-semibold text-slate-700 tabular-nums dark:text-slate-300">
                    {props.previousCount}
                </dd>
            </div>
            <div
                className="rounded-xl bg-indigo-50 px-3 py-2.5 dark:bg-indigo-950/40"
                aria-label={`Recorded jumps: ${props.recordedCount}`}
            >
                <dt className="text-xs font-medium uppercase tracking-wide text-indigo-500 dark:text-indigo-400">
                    Recorded jumps
                </dt>
                <dd className="mt-0.5 text-lg font-semibold text-indigo-700 tabular-nums dark:text-indigo-300">
                    {props.recordedCount}
                </dd>
            </div>
        </dl>
    );
}
