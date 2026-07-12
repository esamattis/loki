import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import clsx from "clsx";
import { app, getAppContext, type AppRequestContext } from "../app";
import * as routes from "../routes";
import {
    aircrafts,
    gear,
    jumps,
    jumpsToGear,
    jumpsToJumpTypes,
    jumpTypes,
    locations,
} from "../schema";
import { LogbookPage } from "./layout";

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

interface StatisticsItem {
    uuid: string;
    name: string;
    archived: boolean;
    previousJumpCount: number;
    recordedJumpCount: number;
    href: string;
}

function getTotalJumpCount(item: StatisticsItem): number {
    return item.previousJumpCount + item.recordedJumpCount;
}

function compareStatisticsItems(
    first: StatisticsItem,
    second: StatisticsItem,
): number {
    const countDifference =
        getTotalJumpCount(second) - getTotalJumpCount(first);
    return countDifference || first.name.localeCompare(second.name);
}

function YearNavigationBar(props: {
    year: number | undefined;
    availableYears: number[];
    previousYear: number | undefined;
    nextYear: number | undefined;
}) {
    const allYearsHref = routes.logbookDetailedStatistics({}, {});
    const sortedAscending = [...props.availableYears].sort((a, b) => a - b);

    function linkClass(active: boolean): string {
        return clsx(
            "inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium transition",
            active
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-900/40 dark:text-indigo-300"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800",
        );
    }

    return (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                    {props.year === undefined ? (
                        <span>
                            Showing{" "}
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                                all years
                            </span>
                        </span>
                    ) : (
                        <span>
                            Showing{" "}
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {props.year}
                            </span>
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href={
                            props.previousYear !== undefined
                                ? routes.logbookDetailedStatistics(
                                      {},
                                      {
                                          year: props.previousYear,
                                      },
                                  )
                                : undefined
                        }
                        aria-disabled={props.previousYear === undefined}
                        className={clsx(
                            "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                            props.previousYear === undefined
                                ? "pointer-events-none border-slate-100 bg-slate-50 text-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-700"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800",
                        )}
                    >
                        ← {props.previousYear ?? "—"}
                    </a>
                    <a
                        href={
                            props.nextYear !== undefined
                                ? routes.logbookDetailedStatistics(
                                      {},
                                      {
                                          year: props.nextYear,
                                      },
                                  )
                                : undefined
                        }
                        aria-disabled={props.nextYear === undefined}
                        className={clsx(
                            "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                            props.nextYear === undefined
                                ? "pointer-events-none border-slate-100 bg-slate-50 text-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-700"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800",
                        )}
                    >
                        {props.nextYear ?? "—"} →
                    </a>
                    <a
                        href={allYearsHref}
                        className={linkClass(props.year === undefined)}
                    >
                        All years
                    </a>
                </div>
            </div>
            {sortedAscending.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {sortedAscending.map((availableYear) => (
                        <a
                            key={availableYear}
                            href={routes.logbookDetailedStatistics(
                                {},
                                {
                                    year: availableYear,
                                },
                            )}
                            className={linkClass(props.year === availableYear)}
                        >
                            {availableYear}
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatisticsSection(props: {
    title: string;
    items: StatisticsItem[];
    filteredByYear: boolean;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-baseline justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {props.title}
                </h2>
                <span className="text-sm text-slate-400 dark:text-slate-500">
                    {props.items.length} items
                </span>
            </div>
            {props.items.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    No {props.title.toLowerCase()} yet.
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
                        <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                            <tr>
                                <th scope="col" className="px-5 py-3">
                                    Item
                                </th>
                                <th
                                    scope="col"
                                    className="px-5 py-3 text-right"
                                >
                                    {props.filteredByYear
                                        ? "Jumps"
                                        : "Recorded"}
                                </th>
                                {!props.filteredByYear && (
                                    <th
                                        scope="col"
                                        className="px-5 py-3 text-right"
                                    >
                                        Total jumps
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {props.items.map((item) => (
                                <tr key={item.uuid}>
                                    <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                                        <a
                                            href={item.href}
                                            className="transition hover:text-indigo-600 hover:underline dark:hover:text-indigo-400"
                                        >
                                            {item.name}
                                        </a>
                                        {item.archived && (
                                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                Archived
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 text-right tabular-nums text-slate-600 dark:text-slate-400">
                                        {item.recordedJumpCount.toLocaleString(
                                            "en-US",
                                        )}
                                    </td>
                                    {!props.filteredByYear && (
                                        <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                                            {getTotalJumpCount(
                                                item,
                                            ).toLocaleString("en-US")}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

function toStatisticsItems(
    rows: Array<{
        uuid: string;
        name: string;
        archived: boolean;
        previousJumpCount: number;
        recordedJumpCount: number;
    }>,
    getHref: (uuid: string) => string,
): StatisticsItem[] {
    return rows
        .map((row) => ({ ...row, href: getHref(row.uuid) }))
        .sort(compareStatisticsItems);
}

function parseYear(value: unknown): number | undefined {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    const year = Number(value);
    if (!Number.isInteger(year) || year < 1 || year > 9999) {
        return undefined;
    }
    return year;
}

interface DetailedStatisticsResult {
    locationRows: StatisticsItemRow[];
    aircraftRows: StatisticsItemRow[];
    gearRows: StatisticsItemRow[];
    jumpTypeRows: StatisticsItemRow[];
    years: number[];
    totalJumps: number;
}

interface StatisticsItemRow {
    uuid: string;
    name: string;
    archived: boolean;
    previousJumpCount: number;
    recordedJumpCount: number;
}

async function fetchTotalJumps(
    db: ReturnType<typeof getAppContext>["db"],
    userUuid: string,
    yearCondition: ReturnType<typeof and> | undefined,
): Promise<number> {
    const [row] = await db
        .select({
            totalJumps: sql<number>`count(*)`,
        })
        .from(jumps)
        .where(
            yearCondition
                ? and(eq(jumps.userUuid, userUuid), yearCondition)
                : eq(jumps.userUuid, userUuid),
        );
    return row?.totalJumps ?? 0;
}

async function fetchDetailedStatistics(
    c: AppRequestContext,
    year: number | undefined,
): Promise<DetailedStatisticsResult> {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const yearCondition = year
        ? and(
              gte(jumps.jumpDate, `${year}-01-01`),
              lt(jumps.jumpDate, `${year + 1}-01-01`),
          )
        : undefined;
    const joinCondition = (base: ReturnType<typeof and>) =>
        yearCondition ? and(base, yearCondition) : base;

    const [locationRows, aircraftRows, gearRows, jumpTypeRows, yearRows] =
        await Promise.all([
            db
                .select({
                    uuid: locations.uuid,
                    name: locations.name,
                    archived: locations.archived,
                    previousJumpCount: locations.previousJumpCount,
                    recordedJumpCount: sql<number>`count(${jumps.uuid})`,
                })
                .from(locations)
                .leftJoin(
                    jumps,
                    joinCondition(
                        and(
                            eq(locations.uuid, jumps.locationUuid),
                            eq(jumps.userUuid, userUuid),
                        ),
                    ),
                )
                .where(eq(locations.userUuid, userUuid))
                .groupBy(locations.uuid)
                .orderBy(asc(locations.name)),
            db
                .select({
                    uuid: aircrafts.uuid,
                    name: aircrafts.name,
                    archived: aircrafts.archived,
                    previousJumpCount: aircrafts.previousJumpCount,
                    recordedJumpCount: sql<number>`count(${jumps.uuid})`,
                })
                .from(aircrafts)
                .leftJoin(
                    jumps,
                    joinCondition(
                        and(
                            eq(aircrafts.uuid, jumps.aircraftUuid),
                            eq(jumps.userUuid, userUuid),
                        ),
                    ),
                )
                .where(eq(aircrafts.userUuid, userUuid))
                .groupBy(aircrafts.uuid)
                .orderBy(asc(aircrafts.name)),
            db
                .select({
                    uuid: gear.uuid,
                    name: gear.name,
                    archived: gear.archived,
                    previousJumpCount: gear.previousUsageCount,
                    recordedJumpCount: sql<number>`count(${jumps.uuid})`,
                })
                .from(gear)
                .leftJoin(jumpsToGear, eq(gear.uuid, jumpsToGear.gearUuid))
                .leftJoin(
                    jumps,
                    joinCondition(
                        and(
                            eq(jumpsToGear.jumpUuid, jumps.uuid),
                            eq(jumps.userUuid, userUuid),
                        ),
                    ),
                )
                .where(eq(gear.userUuid, userUuid))
                .groupBy(gear.uuid)
                .orderBy(asc(gear.name)),
            db
                .select({
                    uuid: jumpTypes.uuid,
                    name: jumpTypes.name,
                    archived: jumpTypes.archived,
                    previousJumpCount: jumpTypes.previousUsageCount,
                    recordedJumpCount: sql<number>`count(${jumps.uuid})`,
                })
                .from(jumpTypes)
                .leftJoin(
                    jumpsToJumpTypes,
                    eq(jumpTypes.uuid, jumpsToJumpTypes.jumpTypeUuid),
                )
                .leftJoin(
                    jumps,
                    joinCondition(
                        and(
                            eq(jumpsToJumpTypes.jumpUuid, jumps.uuid),
                            eq(jumps.userUuid, userUuid),
                        ),
                    ),
                )
                .where(eq(jumpTypes.userUuid, userUuid))
                .groupBy(jumpTypes.uuid)
                .orderBy(asc(jumpTypes.name)),
            db
                .select({ year: sql<string>`substr(${jumps.jumpDate}, 1, 4)` })
                .from(jumps)
                .where(eq(jumps.userUuid, userUuid))
                .groupBy(sql`substr(${jumps.jumpDate}, 1, 4)`)
                .orderBy(sql`substr(${jumps.jumpDate}, 1, 4) desc`),
        ]);

    const years = yearRows
        .map((row) => Number(row.year))
        .filter((y): y is number => Number.isInteger(y) && y > 0)
        .sort((a, b) => b - a);

    const totalJumps = await fetchTotalJumps(db, userUuid, yearCondition);

    return {
        locationRows,
        aircraftRows,
        gearRows,
        jumpTypeRows,
        years,
        totalJumps,
    };
}

async function renderDetailedStatistics(c: AppRequestContext) {
    const { year: rawYear } = routes.logbookDetailedStatistics.query(c);
    const year = parseYear(rawYear);
    const filteredByYear = year !== undefined;

    const {
        locationRows,
        aircraftRows,
        gearRows,
        jumpTypeRows,
        years: availableYears,
        totalJumps,
    } = await fetchDetailedStatistics(c, year);

    const locationsWithCounts = toStatisticsItems(locationRows, (uuid) =>
        routes.locationEdit({ uuid }),
    ).filter((item) => getTotalJumpCount(item) > 0);
    const aircraftWithCounts = toStatisticsItems(aircraftRows, (uuid) =>
        routes.aircraftEdit({ uuid }),
    ).filter((item) => getTotalJumpCount(item) > 0);
    const gearWithCounts = toStatisticsItems(gearRows, (uuid) =>
        routes.gearEdit({ uuid }),
    ).filter((item) => getTotalJumpCount(item) > 0);
    const jumpTypesWithCounts = toStatisticsItems(jumpTypeRows, (uuid) =>
        routes.jumpTypeEdit({ uuid }),
    ).filter((item) => getTotalJumpCount(item) > 0);

    const previousYear =
        year !== undefined && availableYears.includes(year)
            ? availableYears.find((y) => y < year)
            : undefined;
    const nextYear =
        year !== undefined && availableYears.includes(year)
            ? [...availableYears].sort((a, b) => a - b).find((y) => y > year)
            : undefined;

    return c.render(
        <LogbookPage title="Detailed statistics">
            <a
                href={routes.logbookStatistics({})}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
                ← Back to statistics
            </a>
            <YearNavigationBar
                year={year}
                availableYears={availableYears}
                previousYear={previousYear}
                nextYear={nextYear}
            />
            <p className="text-sm text-slate-500 dark:text-slate-400">
                {filteredByYear
                    ? `Showing jumps recorded in ${year}.`
                    : "Total jumps combine recorded jumps with each item's previous count."}
            </p>
            <SummaryCard
                label="Total jumps"
                value={totalJumps.toLocaleString("en-US")}
            />
            <div className="space-y-6">
                <StatisticsSection
                    title="Locations"
                    items={locationsWithCounts}
                    filteredByYear={filteredByYear}
                />
                <StatisticsSection
                    title="Aircraft"
                    items={aircraftWithCounts}
                    filteredByYear={filteredByYear}
                />
                <StatisticsSection
                    title="Gear"
                    items={gearWithCounts}
                    filteredByYear={filteredByYear}
                />
                <StatisticsSection
                    title="Jump types"
                    items={jumpTypesWithCounts}
                    filteredByYear={filteredByYear}
                />
            </div>
        </LogbookPage>,
    );
}

app.get(routes.logbookDetailedStatistics.route, renderDetailedStatistics);
