import { eq, sql } from "drizzle-orm";
import { app, getAppContext, type AppRequestContext } from "../app";
import * as routes from "../routes";
import { jumps } from "../schema";
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
    const hours = Math.floor(totalSeconds / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];
    if (hours > 0) {
        parts.push(`${hours} h`);
    }
    if (minutes > 0 || hours > 0) {
        parts.push(`${minutes} min`);
    }
    parts.push(`${seconds} s`);
    return parts.join(" ");
}

function SummaryCard(props: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {props.label}
            </dt>
            <dd className="mt-2 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                {props.value}
            </dd>
        </div>
    );
}

async function renderStatistics(c: AppRequestContext) {
    const userUuid = getAppContext(c).getUser().uuid;
    const startOfCurrentYear = getStartOfCurrentYear();
    const startOfCurrentMonth = getStartOfCurrentMonth();
    const startOfPreviousMonth = getStartOfPreviousMonth();
    const twelveMonthsAgo = getTwelveMonthsAgo();
    const [stats] = await getAppContext(c)
        .db.select({
            totalJumps: sql<number>`count(*)`,
            currentYearJumps: sql<number>`coalesce(sum(case when ${jumps.jumpDate} >= ${startOfCurrentYear} then 1 else 0 end), 0)`,
            lastTwelveMonthsJumps: sql<number>`coalesce(sum(case when ${jumps.jumpDate} >= ${twelveMonthsAgo} then 1 else 0 end), 0)`,
            lastMonthJumps: sql<number>`coalesce(sum(case when ${jumps.jumpDate} >= ${startOfPreviousMonth} and ${jumps.jumpDate} < ${startOfCurrentMonth} then 1 else 0 end), 0)`,
            totalFreefallTime: sql<number>`coalesce(sum(${jumps.freefallTime}), 0)`,
        })
        .from(jumps)
        .where(eq(jumps.userUuid, userUuid));

    const values = stats ?? {
        totalJumps: 0,
        currentYearJumps: 0,
        lastTwelveMonthsJumps: 0,
        lastMonthJumps: 0,
        totalFreefallTime: 0,
    };

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
            <a
                href={routes.logbookDetailedStatistics({}, {})}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
                View detailed statistics
            </a>
        </LogbookPage>,
    );
}

app.get(routes.logbookStatistics.route, renderStatistics);
