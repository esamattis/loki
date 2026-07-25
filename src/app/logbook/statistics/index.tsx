import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import clsx from "clsx";
import { useId } from "hono/jsx";
import {
    getAppContext,
    useAppContext,
    useNumberFormatter,
    type App,
    type AppRequestContext,
} from "@/app/app";
import { ButtonLink } from "@/components/form";
import type { CalendarDuration } from "@/format";
import { Script } from "@/components/script";
import { SingleNumberCard } from "@/components/ui/single-number-card";
import * as routes from "@/routes";
import {
    jumps,
    jumpsToAircrafts,
    jumpsToGear,
    jumpsToJumpTypes,
} from "@/schema";
import { $select } from "@/utils";
import { LogbookPage } from "@/app/logbook-page";
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

function parseDate(date: string): Date {
    return new Date(`${date}T00:00:00.000Z`);
}

function addUtcMonths(date: Date, months: number): Date {
    const firstOfTargetMonth = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
    );
    const lastDayOfTargetMonth = new Date(
        Date.UTC(
            firstOfTargetMonth.getUTCFullYear(),
            firstOfTargetMonth.getUTCMonth() + 1,
            0,
        ),
    ).getUTCDate();
    firstOfTargetMonth.setUTCDate(
        Math.min(date.getUTCDate(), lastDayOfTargetMonth),
    );
    return firstOfTargetMonth;
}

function getRollingCountDropDate(jumpDateValue: string): string {
    const jumpDate = parseDate(jumpDateValue);
    const dropDate = new Date(jumpDate);
    dropDate.setUTCFullYear(dropDate.getUTCFullYear() + 1);
    if (formatDate(dropDate).slice(5) === jumpDateValue.slice(5)) {
        dropDate.setUTCDate(dropDate.getUTCDate() + 1);
    }
    return formatDate(dropDate);
}

function getCalendarDuration(
    startDate: string,
    endDate: string,
): CalendarDuration {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    let months = 0;
    while (addUtcMonths(start, months + 1) <= end) {
        months++;
    }
    const afterMonths = addUtcMonths(start, months);
    const remainingDays = Math.round(
        (end.getTime() - afterMonths.getTime()) / (24 * 60 * 60 * 1_000),
    );
    return {
        months,
        weeks: Math.floor(remainingDays / 7),
        days: remainingDays % 7,
    };
}

function LastTwelveMonthsFooter(props: {
    latestJumpDate: string | null;
    thresholdJumpDate: string | null;
    lastTwelveMonthsJumps: number;
}) {
    const app = useAppContext();
    const formatCalendarDuration = app.calendarDurationFormatter();
    const requirement =
        "In Finland, at least 10 jumps in the last 12 months are required to keep a skydiving license valid.";
    if (props.latestJumpDate === null) {
        return <>{requirement} No jumps have been recorded yet.</>;
    }
    const today = formatDate(new Date());
    if (props.lastTwelveMonthsJumps === 0) {
        const duration = getCalendarDuration(props.latestJumpDate, today);
        return (
            <>
                {requirement} The last jump was{" "}
                {formatCalendarDuration(duration)} ago, on{" "}
                {app.dateFormatter()(props.latestJumpDate)}.
            </>
        );
    }
    if (props.thresholdJumpDate === null) {
        return <>{requirement} This count is already below 10.</>;
    }
    const dropDate = getRollingCountDropDate(props.thresholdJumpDate);
    const duration = getCalendarDuration(today, dropDate);
    return (
        <>
            {requirement} If no more jumps are made, this count will fall below
            10 in {formatCalendarDuration(duration)}, on{" "}
            {app.dateFormatter()(dropDate)}.
        </>
    );
}

function getYearsSince(date: string | null): number {
    if (date === null) {
        return 0;
    }
    const firstJumpYear = Number(date.slice(0, 4));
    if (!Number.isInteger(firstJumpYear)) {
        return 0;
    }
    const today = new Date();
    const currentYear = today.getUTCFullYear();
    const anniversaryHasPassed = formatDate(today).slice(5) >= date.slice(5);
    return Math.max(
        currentYear - firstJumpYear - (anniversaryHasPassed ? 0 : 1),
        0,
    );
}

function getAverageJumpsPerCompletedActiveYear(
    yearlyData: Array<{ year: number; count: number }>,
): number {
    const currentYear = new Date().getUTCFullYear();
    const completedActiveYears = yearlyData.filter(
        (entry) => entry.year !== currentYear,
    );
    if (completedActiveYears.length === 0) {
        return 0;
    }
    return (
        completedActiveYears.reduce((total, entry) => total + entry.count, 0) /
        completedActiveYears.length
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

function insufficientJumpDataCondition() {
    return or(
        isNull(jumps.freefallTime),
        and(
            eq(jumps.freefallTime, 0),
            sql`${jumps.exitAltitude} != ${jumps.openingAltitude}`,
        ),
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
}

async function renderStatistics(c: AppRequestContext) {
    const app = getAppContext(c);
    const user = app.getUser();
    const userUuid = user.uuid;
    const startOfCurrentYear = getStartOfCurrentYear();
    const startOfCurrentMonth = getStartOfCurrentMonth();
    const startOfPreviousMonth = getStartOfPreviousMonth();
    const twelveMonthsAgo = getTwelveMonthsAgo();
    const insufficientDataCondition = insufficientJumpDataCondition();
    const [[stats], yearlyRows, jumpNumberRows, insufficientDataJumps] =
        await Promise.all([
            app.db
                .select({
                    totalJumps: sql<number>`coalesce(max(${jumps.jumpNumber}), 0)`,
                    firstJumpDate: sql<string | null>`min(${jumps.jumpDate})`,
                    currentYearJumps: sql<number>`coalesce(sum(case when ${jumps.jumpDate} >= ${startOfCurrentYear} then 1 else 0 end), 0)`,
                    lastTwelveMonthsJumps: sql<number>`coalesce(sum(case when ${jumps.jumpDate} >= ${twelveMonthsAgo} then 1 else 0 end), 0)`,
                    latestJumpDate: sql<string | null>`max(${jumps.jumpDate})`,
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
                .select({
                    jumpNumber: jumps.jumpNumber,
                    jumpDate: jumps.jumpDate,
                })
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
        firstJumpDate: null,
        currentYearJumps: 0,
        lastTwelveMonthsJumps: 0,
        latestJumpDate: null,
        lastMonthJumps: 0,
    };
    const formatNumber = app.numberFormatter();

    const yearlyData = yearlyRows
        .map((row) => ({
            year: Number(row.year),
            count: Number(row.count),
        }))
        .filter((entry) => Number.isInteger(entry.year) && entry.year > 0);
    const averageJumpsPerActiveYear =
        getAverageJumpsPerCompletedActiveYear(yearlyData);

    const jumpNumberGaps = findJumpNumberGaps(
        jumpNumberRows.map((row) => row.jumpNumber),
    );
    const qualifyingJumpDates = jumpNumberRows
        .map((row) => row.jumpDate)
        .filter((jumpDate) => jumpDate >= twelveMonthsAgo)
        .sort((first, second) => second.localeCompare(first));
    const thresholdJumpDate = qualifyingJumpDates[9] ?? null;

    return c.render(
        <LogbookPage title="Statistics">
            <ButtonLink
                href={routes.logbook.statistics.detailed({}, {})}
                variant="secondary"
                className="gap-1.5"
            >
                View yearly statistics
            </ButtonLink>
            <dl className="grid gap-4 sm:grid-cols-2">
                <SingleNumberCard
                    label="Total jumps"
                    value={formatNumber(values.totalJumps)}
                />
                <SingleNumberCard
                    label="Jumps this year"
                    value={formatNumber(values.currentYearJumps)}
                />
                <SingleNumberCard
                    label="Jumps in the last 12 months"
                    value={formatNumber(values.lastTwelveMonthsJumps)}
                    footer={
                        <LastTwelveMonthsFooter
                            latestJumpDate={values.latestJumpDate}
                            thresholdJumpDate={thresholdJumpDate}
                            lastTwelveMonthsJumps={values.lastTwelveMonthsJumps}
                        />
                    }
                />
                <SingleNumberCard
                    label="Jumps last month"
                    value={formatNumber(values.lastMonthJumps)}
                />
                <SingleNumberCard
                    label="Years since first jump"
                    value={formatNumber(getYearsSince(values.firstJumpDate))}
                />
                <SingleNumberCard
                    label="Active jump years"
                    value={formatNumber(yearlyData.length)}
                />
                <SingleNumberCard
                    label="Average jumps per active year"
                    value={formatNumber(averageJumpsPerActiveYear, {
                        maximumFractionDigits: 1,
                    })}
                    description="Based on years with at least one recorded jump. The current year is excluded."
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
        </LogbookPage>,
    );
}

export function register(app: App) {
    app.get(routes.logbook.statistics.index.route, renderStatistics);
}
