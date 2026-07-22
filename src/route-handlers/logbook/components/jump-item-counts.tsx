export function JumpItemCounts(props: {
    previousLabel: string;
    previousCount: number;
    previousTooltip: string;
    recordedCount: number;
    recordedTooltip: string;
}) {
    return (
        <dl className="mt-3 grid grid-cols-2 gap-3">
            <div
                data-loki-tooltip={props.previousTooltip}
                aria-label={`${props.previousLabel}: ${props.previousCount}`}
            >
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Previous
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-700 tabular-nums dark:text-slate-300">
                    {props.previousCount}
                </dd>
            </div>
            <div
                data-loki-tooltip={props.recordedTooltip}
                aria-label={`Recorded jumps: ${props.recordedCount}`}
            >
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Recorded
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-700 tabular-nums dark:text-slate-300">
                    {props.recordedCount}
                </dd>
            </div>
        </dl>
    );
}
