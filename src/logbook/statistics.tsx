import { asc, eq, sql } from "drizzle-orm";
import clsx from "clsx";
import { useId } from "hono/jsx";
import { app, getAppContext, type AppRequestContext } from "../app";
import { Script } from "../components/helpers";
import * as routes from "../routes";
import { jumps } from "../schema";
import { $assertElement } from "../utils";
import { LogbookPage } from "./layout";

function formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function getStartOfCurrentYear(): string {
    const today = new Date();
    return `${today.getUTCFullYear()}-01-01`;
}

function getStartOfCurrentMonth(): string {
    const date = new Date();
    date.setUTCDate(1);
    return formatDate(date);
}

function getStartOfPreviousMonth(): string {
    const date = new Date();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - 1);
    return formatDate(date);
}

function getTwelveMonthsAgo(): string {
    const date = new Date();
    date.setUTCFullYear(date.getUTCFullYear() - 1);
    return formatDate(date);
}

function formatDuration(totalSeconds: number): string {
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];
    if (days > 0) {
        parts.push(`${days} d`);
    }
    if (hours > 0 || days > 0) {
        parts.push(`${hours} h`);
    }
    if (minutes > 0 || hours > 0 || days > 0) {
        parts.push(`${minutes} min`);
    }
    parts.push(`${seconds} s`);
    return parts.join(" ");
}

function SummaryCard(props: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {props.label}
            </dt>
            <dd className="mt-2 text-3xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
                {props.value}
            </dd>
        </div>
    );
}

function findJumpNumberGaps(jumpNumbers: number[]): number[] {
    if (jumpNumbers.length < 2) {
        return [];
    }
    const gaps: number[] = [];
    for (let i = 1; i < jumpNumbers.length; i++) {
        const previous = jumpNumbers[i - 1]!;
        const current = jumpNumbers[i]!;
        for (let missing = previous + 1; missing < current; missing++) {
            gaps.push(missing);
        }
    }
    return gaps;
}

function JumpNumberGaps(props: { gaps: number[] }) {
    if (props.gaps.length === 0) {
        return null;
    }
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Jump number gaps
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {props.gaps.length.toLocaleString("en-US")} missing
                </p>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Missing jump numbers between your first and last recorded jump.
                Select a number to add that jump.
            </p>
            <ul className="mt-4 grid max-h-80 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                {props.gaps.map((jumpNumber) => (
                    <li key={jumpNumber}>
                        <a
                            href={routes.jumpNew(
                                {},
                                { jumpNumber: String(jumpNumber) },
                            )}
                            className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-medium tabular-nums text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-400 dark:hover:border-indigo-500 dark:hover:bg-slate-700 dark:focus:ring-indigo-400/40"
                        >
                            #{jumpNumber}
                        </a>
                    </li>
                ))}
            </ul>
        </section>
    );
}

function YearlyJumpsHistogram(props: {
    data: Array<{ year: number; count: number }>;
}) {
    if (props.data.length === 0) {
        return null;
    }
    const yearMap = new Map<number, number>();
    for (const entry of props.data) {
        yearMap.set(entry.year, entry.count);
    }
    const sortedYears = [...props.data].sort((a, b) => a.year - b.year);
    const minYear = sortedYears[0]!.year;
    const maxYear = sortedYears[sortedYears.length - 1]!.year;
    const fullData: Array<{
        year: number;
        count: number;
        gap: boolean;
    }> = [];
    for (let year = minYear; year <= maxYear; year++) {
        const recorded = yearMap.has(year);
        fullData.push({
            year,
            count: yearMap.get(year) ?? 0,
            gap: !recorded,
        });
    }
    const maxCount = Math.max(...fullData.map((entry) => entry.count), 1);
    const maxBarHeight = 160;
    const toggleId = useId();
    const containerId = useId();
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Jumps per year
                </h2>
                <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input
                        id={toggleId}
                        type="checkbox"
                        checked
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/40 dark:border-slate-600 dark:bg-slate-800"
                    />
                    Show gap years
                </label>
            </div>
            <div
                id={containerId}
                className="mt-4 flex items-end gap-2 overflow-x-auto"
            >
                {fullData.map((entry) => {
                    const barHeight = Math.max(
                        2,
                        Math.round((entry.count / maxCount) * maxBarHeight),
                    );
                    return (
                        <div
                            key={entry.year}
                            className={clsx(
                                "flex min-w-10 flex-1 flex-col items-center",
                                entry.gap && "histogram-gap-year",
                            )}
                        >
                            <span className="mb-1 text-xs font-medium tabular-nums text-slate-600 dark:text-slate-300">
                                {entry.count}
                            </span>
                            <div
                                className={clsx(
                                    "w-full rounded-t-md",
                                    entry.gap
                                        ? "bg-slate-300 dark:bg-slate-600"
                                        : "bg-indigo-500 dark:bg-indigo-400",
                                )}
                                style={{ height: `${barHeight}px` }}
                                title={`${entry.count} jumps in ${entry.year}`}
                                aria-label={`${entry.count} jumps in ${entry.year}`}
                            />
                            <span className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                                {entry.year}
                            </span>
                        </div>
                    );
                })}
            </div>
            <Script
                $deps={[$assertElement]}
                $args={[toggleId, containerId]}
                $exec={(toggleId, containerId) => {
                    const toggle = document.getElementById(toggleId);
                    $assertElement(toggle, HTMLInputElement);
                    const container = document.getElementById(containerId);
                    $assertElement(container, HTMLDivElement);
                    function applyGapVisibility(
                        checkbox: HTMLInputElement,
                        containerEl: HTMLDivElement,
                    ) {
                        const gaps = containerEl.querySelectorAll<HTMLElement>(
                            ".histogram-gap-year",
                        );
                        const visible = checkbox.checked;
                        for (const gap of gaps) {
                            gap.style.display = visible ? "" : "none";
                        }
                    }
                    applyGapVisibility(toggle, container);
                    toggle.addEventListener("change", () =>
                        applyGapVisibility(toggle, container),
                    );
                }}
            />
        </section>
    );
}

async function renderStatistics(c: AppRequestContext) {
    const user = getAppContext(c).getUser();
    const userUuid = user.uuid;
    const startOfCurrentYear = getStartOfCurrentYear();
    const startOfCurrentMonth = getStartOfCurrentMonth();
    const startOfPreviousMonth = getStartOfPreviousMonth();
    const twelveMonthsAgo = getTwelveMonthsAgo();
    const [[stats], yearlyRows, jumpNumberRows] = await Promise.all([
        getAppContext(c)
            .db.select({
                totalJumps: sql<number>`count(*) + ${user.options.previousJumpCount}`,
                currentYearJumps: sql<number>`coalesce(sum(case when ${jumps.jumpDate} >= ${startOfCurrentYear} then 1 else 0 end), 0)`,
                lastTwelveMonthsJumps: sql<number>`coalesce(sum(case when ${jumps.jumpDate} >= ${twelveMonthsAgo} then 1 else 0 end), 0)`,
                lastMonthJumps: sql<number>`coalesce(sum(case when ${jumps.jumpDate} >= ${startOfPreviousMonth} and ${jumps.jumpDate} < ${startOfCurrentMonth} then 1 else 0 end), 0)`,
                totalFreefallTime: sql<number>`coalesce(sum(${jumps.freefallTime}), 0)`,
            })
            .from(jumps)
            .where(eq(jumps.userUuid, userUuid)),
        getAppContext(c)
            .db.select({
                year: sql<string>`substr(${jumps.jumpDate}, 1, 4)`,
                count: sql<number>`count(*)`,
            })
            .from(jumps)
            .where(eq(jumps.userUuid, userUuid))
            .groupBy(sql`substr(${jumps.jumpDate}, 1, 4)`)
            .orderBy(sql`substr(${jumps.jumpDate}, 1, 4)`),
        getAppContext(c)
            .db.select({ jumpNumber: jumps.jumpNumber })
            .from(jumps)
            .where(eq(jumps.userUuid, userUuid))
            .orderBy(asc(jumps.jumpNumber)),
    ]);

    const values = stats ?? {
        totalJumps: 0,
        currentYearJumps: 0,
        lastTwelveMonthsJumps: 0,
        lastMonthJumps: 0,
        totalFreefallTime: 0,
    };

    const yearlyData = yearlyRows
        .map((row) => ({
            year: Number(row.year),
            count: Number(row.count),
        }))
        .filter((entry) => Number.isInteger(entry.year) && entry.year > 0);

    const jumpNumberGaps = findJumpNumberGaps(
        jumpNumberRows.map((row) => row.jumpNumber),
    );

    return c.render(
        <LogbookPage title="Statistics">
            <dl className="grid gap-4 sm:grid-cols-2">
                <SummaryCard
                    label="Total jumps"
                    value={values.totalJumps.toLocaleString("en-US")}
                />
                <SummaryCard
                    label="Jumps this year"
                    value={values.currentYearJumps.toLocaleString("en-US")}
                />
                <SummaryCard
                    label="Jumps in the last 12 months"
                    value={values.lastTwelveMonthsJumps.toLocaleString("en-US")}
                />
                <SummaryCard
                    label="Jumps last month"
                    value={values.lastMonthJumps.toLocaleString("en-US")}
                />
                <SummaryCard
                    label="Total freefall time"
                    value={formatDuration(values.totalFreefallTime)}
                />
            </dl>
            <YearlyJumpsHistogram data={yearlyData} />
            <JumpNumberGaps gaps={jumpNumberGaps} />
            <a
                href={routes.logbookDetailedStatistics({}, {})}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-indigo-400/40"
            >
                View detailed statistics
            </a>
        </LogbookPage>,
    );
}

app.get(routes.logbookStatistics.route, renderStatistics);
