import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import clsx from "clsx";
import { useId } from "hono/jsx";
import {
    getAppContext,
    useNumberFormatter,
    type App,
    type AppRequestContext,
} from "@/app/app";
import { ButtonLink } from "@/components/form";
import { Script } from "@/components/script";
import * as routes from "@/routes";
import {
    jumps,
    jumpsToAircrafts,
    jumpsToGear,
    jumpsToJumpTypes,
} from "@/schema";
import { $select } from "@/utils";
import { LogbookPage } from "@/app/authenticated-page";
import { JumpIssueList } from "@/route-handlers/logbook/statistics/jump-issue-list";

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
    return (
        <JumpIssueList
            title="Jump number gaps"
            countLabel="missing"
            description="Missing jump numbers between your first and last recorded jump. Select a number to add that jump."
            items={props.gaps.map((jumpNumber) => ({
                key: String(jumpNumber),
                jumpNumber,
                href: routes.logbook.jumps.new(
                    {},
                    { jumpNumber: String(jumpNumber) },
                ),
            }))}
        />
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
    const formatNumber = useNumberFormatter();
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
                                {formatNumber(entry.count)}
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
                $deps={[$select]}
                $args={[toggleId, containerId]}
                $exec={(toggleId, containerId) => {
                    const toggle = $select.id(toggleId, HTMLInputElement);
                    const container = $select.id(containerId, HTMLDivElement);
                    function applyGapVisibility(
                        checkbox: HTMLInputElement,
                        containerEl: HTMLDivElement,
                    ) {
                        const gaps = $select.all(
                            ".histogram-gap-year",
                            HTMLElement,
                            containerEl,
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
    const app = getAppContext(c);
    const user = app.getUser();
    const userUuid = user.uuid;
    const startOfCurrentYear = getStartOfCurrentYear();
    const startOfCurrentMonth = getStartOfCurrentMonth();
    const startOfPreviousMonth = getStartOfPreviousMonth();
    const twelveMonthsAgo = getTwelveMonthsAgo();
    const insufficientDataCondition = or(
        isNull(jumps.freefallTime),
        eq(jumps.freefallTime, 0),
        sql`${jumps.freefallTime} = ''`,
        isNull(jumps.exitAltitude),
        eq(jumps.exitAltitude, 0),
        sql`${jumps.exitAltitude} = ''`,
        isNull(jumps.openingAltitude),
        eq(jumps.openingAltitude, 0),
        sql`${jumps.openingAltitude} = ''`,
        isNull(jumps.locationUuid),
        sql`not exists (
            select 1 from ${jumpsToAircrafts}
            where ${jumpsToAircrafts.jumpUuid} = ${jumps.uuid}
        )`,
        sql`not exists (
            select 1 from ${jumpsToGear}
            where ${jumpsToGear.jumpUuid} = ${jumps.uuid}
        )`,
        sql`not exists (
            select 1 from ${jumpsToJumpTypes}
            where ${jumpsToJumpTypes.jumpUuid} = ${jumps.uuid}
        )`,
    );
    const [[stats], yearlyRows, jumpNumberRows, insufficientDataJumps] =
        await Promise.all([
            app.db
                .select({
                    totalJumps: sql<number>`count(*) + ${user.options.previousJumpCount}`,
                    currentYearJumps: sql<number>`coalesce(sum(case when ${jumps.jumpDate} >= ${startOfCurrentYear} then 1 else 0 end), 0)`,
                    lastTwelveMonthsJumps: sql<number>`coalesce(sum(case when ${jumps.jumpDate} >= ${twelveMonthsAgo} then 1 else 0 end), 0)`,
                    lastMonthJumps: sql<number>`coalesce(sum(case when ${jumps.jumpDate} >= ${startOfPreviousMonth} and ${jumps.jumpDate} < ${startOfCurrentMonth} then 1 else 0 end), 0)`,
                })
                .from(jumps)
                .where(eq(jumps.userUuid, userUuid)),
            app.db
                .select({
                    year: sql<string>`substr(${jumps.jumpDate}, 1, 4)`,
                    count: sql<number>`count(*)`,
                })
                .from(jumps)
                .where(eq(jumps.userUuid, userUuid))
                .groupBy(sql`substr(${jumps.jumpDate}, 1, 4)`)
                .orderBy(sql`substr(${jumps.jumpDate}, 1, 4)`),
            app.db
                .select({ jumpNumber: jumps.jumpNumber })
                .from(jumps)
                .where(eq(jumps.userUuid, userUuid))
                .orderBy(asc(jumps.jumpNumber)),
            app.db
                .select({
                    uuid: jumps.uuid,
                    jumpNumber: jumps.jumpNumber,
                })
                .from(jumps)
                .where(
                    and(
                        eq(jumps.userUuid, userUuid),
                        insufficientDataCondition,
                    ),
                )
                .orderBy(asc(jumps.jumpNumber)),
        ]);

    const values = stats ?? {
        totalJumps: 0,
        currentYearJumps: 0,
        lastTwelveMonthsJumps: 0,
        lastMonthJumps: 0,
    };
    const formatNumber = app.numberFormatter();

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
                    value={formatNumber(values.totalJumps)}
                />
                <SummaryCard
                    label="Jumps this year"
                    value={formatNumber(values.currentYearJumps)}
                />
                <SummaryCard
                    label="Jumps in the last 12 months"
                    value={formatNumber(values.lastTwelveMonthsJumps)}
                />
                <SummaryCard
                    label="Jumps last month"
                    value={formatNumber(values.lastMonthJumps)}
                />
            </dl>
            <YearlyJumpsHistogram data={yearlyData} />
            <JumpNumberGaps gaps={jumpNumberGaps} />
            <JumpIssueList
                title="Jumps with insufficient data"
                countLabel={
                    insufficientDataJumps.length === 1 ? "jump" : "jumps"
                }
                description="These jumps are missing freefall data or jump items. Select a jump to add the missing data."
                items={insufficientDataJumps.map((jump) => ({
                    key: jump.uuid,
                    jumpNumber: jump.jumpNumber,
                    href: routes.logbook.jumps.edit({ uuid: jump.uuid }),
                }))}
            />
            <ButtonLink
                href={routes.logbook.statistics.detailed({}, {})}
                variant="secondary"
                className="gap-1.5"
            >
                View yearly statistics
            </ButtonLink>
        </LogbookPage>,
    );
}

export function register(app: App) {
    app.get(routes.logbook.statistics.index.route, renderStatistics);
}
