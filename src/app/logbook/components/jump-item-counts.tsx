export function JumpItemCounts(props: {
    previousLabel: string;
    previousCount: number;
    previousTooltip: string;
    recordedCount: number;
    recordedTooltip: string;
}) {
    return (
        <dl className="mt-3 grid grid-cols-2 gap-3">
            <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Previous
                </dt>
                <dd
                    className="mt-0.5 w-fit text-sm font-semibold text-slate-700 tabular-nums dark:text-slate-300"
                    data-loki-tooltip={props.previousTooltip}
                    aria-label={`${props.previousLabel}: ${props.previousCount}`}
                >
                    {props.previousCount}
                </dd>
            </div>
            <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Recorded
                </dt>
                <dd
                    className="mt-0.5 w-fit text-sm font-semibold text-slate-700 tabular-nums dark:text-slate-300"
                    data-loki-tooltip={props.recordedTooltip}
                    aria-label={`Recorded jumps: ${props.recordedCount}`}
                >
                    {props.recordedCount}
                </dd>
            </div>
        </dl>
    );
}
