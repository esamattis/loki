import { and, asc, desc, eq, gt, gte, lt, sql } from "drizzle-orm";
import {
    getAppContext,
    useDateFormatter,
    useNumberFormatter,
    type App,
    type AppRequestContext,
} from "@/app/app";
import { buttonClassName } from "@/components/form";
import * as routes from "@/routes";
import {
    aircrafts,
    gear,
    jumps,
    jumpsToAircrafts,
    jumpsToGear,
    jumpsToJumpTypes,
    jumpTypes,
    locations,
} from "@/schema";
import { LogbookPage } from "@/app/authenticated-page";
import { formatDuration } from "@/utils/format-duration";

interface RecordJump {
    uuid: string;
    jumpNumber: number;
    jumpDate: string;
    value: string;
}

function RecordJumps(props: {
    records: Array<{ label: string; jump: RecordJump | undefined }>;
}) {
    const formatDate = useDateFormatter();
    return (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Record jumps
                </h2>
            </div>
            <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                {props.records.map((record) => (
                    <div
                        key={record.label}
                        className="flex items-center justify-between gap-4 px-5 py-3.5"
                    >
                        <dt className="text-sm text-slate-600 dark:text-slate-400">
                            {record.label}
                        </dt>
                        <dd className="text-right">
                            {record.jump ? (
                                <a
                                    href={routes.logbook.jumps.edit({
                                        uuid: record.jump.uuid,
                                    })}
                                    className="font-medium text-indigo-600 transition hover:underline dark:text-indigo-400"
                                >
                                    {record.jump.value}{" "}
                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                        Jump #{record.jump.jumpNumber} (
                                        {formatDate(record.jump.jumpDate)})
                                    </span>
                                </a>
                            ) : (
                                <span className="text-sm text-slate-400 dark:text-slate-500">
                                    No recorded jump
                                </span>
                            )}
                        </dd>
                    </div>
                ))}
            </dl>
        </section>
    );
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
    const allYearsHref = routes.logbook.statistics.detailed({}, {});
    const sortedAscending = [...props.availableYears].sort((a, b) => a - b);

    function linkClass(active: boolean): string {
        return buttonClassName({
            variant: "secondary",
            size: "sm",
            className: active
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
                : "text-slate-600 dark:text-slate-400",
        });
    }

    function navLinkClass(enabled: boolean): string {
        return buttonClassName({
            variant: "secondary",
            size: "sm",
            className: enabled
                ? "gap-1"
                : "pointer-events-none gap-1 border-slate-100 bg-slate-50 text-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-700",
        });
    }

    return (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-center gap-3">
                <div className="flex items-center gap-2">
                    <a
                        href={
                            props.previousYear !== undefined
                                ? routes.logbook.statistics.detailed(
                                      {},
                                      {
                                          year: props.previousYear,
                                      },
                                  )
                                : undefined
                        }
                        aria-disabled={props.previousYear === undefined}
                        className={navLinkClass(
                            props.previousYear !== undefined,
                        )}
                    >
                        ← {props.previousYear ?? "—"}
                    </a>
                    <a
                        href={
                            props.nextYear !== undefined
                                ? routes.logbook.statistics.detailed(
                                      {},
                                      {
                                          year: props.nextYear,
                                      },
                                  )
                                : undefined
                        }
                        aria-disabled={props.nextYear === undefined}
                        className={navLinkClass(props.nextYear !== undefined)}
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
                <div className="flex flex-wrap justify-center gap-1.5 border-t border-slate-200 pt-3 dark:border-slate-800">
                    {sortedAscending.map((availableYear) => (
                        <a
                            key={availableYear}
                            href={routes.logbook.statistics.detailed(
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
    const formatNumber = useNumberFormatter();
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
                                        {formatNumber(item.recordedJumpCount)}
                                    </td>
                                    {!props.filteredByYear && (
                                        <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                                            {formatNumber(
                                                getTotalJumpCount(item),
                                            )}
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
    totalFreefallTime: number;
    totalFreefallDistance: number;
    longestFreefall: RecordJump | undefined;
    longestFreefallDistance: RecordJump | undefined;
    highestExit: RecordJump | undefined;
    highestOpening: RecordJump | undefined;
    lowestOpening: RecordJump | undefined;
    highestAverageSpeed: RecordJump | undefined;
}

interface StatisticsItemRow {
    uuid: string;
    name: string;
    archived: boolean;
    previousJumpCount: number;
    recordedJumpCount: number;
}

async function fetchTotalJumps(config: {
    db: ReturnType<typeof getAppContext>["db"];
    userUuid: string;
    yearCondition: ReturnType<typeof and> | undefined;
    previousJumpCount: number;
}): Promise<number> {
    const [row] = await config.db
        .select({
            totalJumps: sql<number>`count(*) + ${
                config.yearCondition ? 0 : config.previousJumpCount
            }`,
        })
        .from(jumps)
        .where(
            config.yearCondition
                ? and(eq(jumps.userUuid, config.userUuid), config.yearCondition)
                : eq(jumps.userUuid, config.userUuid),
        );
    return row?.totalJumps ?? 0;
}

function fetchStatisticsRows(
    db: ReturnType<typeof getAppContext>["db"],
    userUuid: string,
    joinCondition: (base: ReturnType<typeof and>) => ReturnType<typeof and>,
) {
    return Promise.all([
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
                jumpsToAircrafts,
                eq(aircrafts.uuid, jumpsToAircrafts.aircraftUuid),
            )
            .leftJoin(
                jumps,
                joinCondition(
                    and(
                        eq(jumpsToAircrafts.jumpUuid, jumps.uuid),
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
    ]);
}

function fetchRecordStatistics(
    db: ReturnType<typeof getAppContext>["db"],
    userUuid: string,
    jumpCondition: ReturnType<typeof and>,
) {
    return Promise.all([
        db
            .select({ year: sql<string>`substr(${jumps.jumpDate}, 1, 4)` })
            .from(jumps)
            .where(eq(jumps.userUuid, userUuid))
            .groupBy(sql`substr(${jumps.jumpDate}, 1, 4)`)
            .orderBy(sql`substr(${jumps.jumpDate}, 1, 4) desc`),
        db
            .select({
                uuid: jumps.uuid,
                jumpNumber: jumps.jumpNumber,
                jumpDate: jumps.jumpDate,
                value: jumps.freefallTime,
            })
            .from(jumps)
            .where(jumpCondition)
            .orderBy(desc(jumps.freefallTime))
            .limit(1),
        db
            .select({
                uuid: jumps.uuid,
                jumpNumber: jumps.jumpNumber,
                jumpDate: jumps.jumpDate,
                value: sql<number>`max(${jumps.exitAltitude} - ${jumps.openingAltitude}, 0)`,
            })
            .from(jumps)
            .where(jumpCondition)
            .orderBy(
                desc(
                    sql`max(${jumps.exitAltitude} - ${jumps.openingAltitude}, 0)`,
                ),
            )
            .limit(1),
        db
            .select({
                uuid: jumps.uuid,
                jumpNumber: jumps.jumpNumber,
                jumpDate: jumps.jumpDate,
                value: jumps.exitAltitude,
            })
            .from(jumps)
            .where(jumpCondition)
            .orderBy(desc(jumps.exitAltitude))
            .limit(1),
        db
            .select({
                uuid: jumps.uuid,
                jumpNumber: jumps.jumpNumber,
                jumpDate: jumps.jumpDate,
                value: jumps.openingAltitude,
            })
            .from(jumps)
            .where(jumpCondition)
            .orderBy(desc(jumps.openingAltitude))
            .limit(1),
        db
            .select({
                uuid: jumps.uuid,
                jumpNumber: jumps.jumpNumber,
                jumpDate: jumps.jumpDate,
                value: jumps.openingAltitude,
            })
            .from(jumps)
            .where(jumpCondition)
            .orderBy(asc(jumps.openingAltitude))
            .limit(1),
        db
            .select({
                uuid: jumps.uuid,
                jumpNumber: jumps.jumpNumber,
                jumpDate: jumps.jumpDate,
                value: sql<number>`(${jumps.exitAltitude} - ${jumps.openingAltitude}) * 1.0 / ${jumps.freefallTime}`,
            })
            .from(jumps)
            .where(and(jumpCondition, gt(jumps.freefallTime, 0)))
            .orderBy(
                desc(
                    sql`(${jumps.exitAltitude} - ${jumps.openingAltitude}) * 1.0 / ${jumps.freefallTime}`,
                ),
            )
            .limit(1),
        db
            .select({
                totalFreefallTime: sql<number>`coalesce(sum(${jumps.freefallTime}), 0)`,
                totalFreefallDistance: sql<number>`coalesce(sum(max(${jumps.exitAltitude} - ${jumps.openingAltitude}, 0)), 0)`,
            })
            .from(jumps)
            .where(jumpCondition),
    ]);
}

async function fetchDetailedStatistics(
    c: AppRequestContext,
    year: number | undefined,
): Promise<DetailedStatisticsResult> {
    const app = getAppContext(c);
    const db = app.db;
    const user = app.getUser();
    const formatAltitude = app.altitudeFormatter();
    const formatSpeed = app.speedFormatter();
    const formatDistance = app.distanceFormatter();
    const userUuid = user.uuid;
    const yearCondition = year
        ? and(
              gte(jumps.jumpDate, `${year}-01-01`),
              lt(jumps.jumpDate, `${year + 1}-01-01`),
          )
        : undefined;
    const joinCondition = (base: ReturnType<typeof and>) =>
        yearCondition ? and(base, yearCondition) : base;
    const jumpCondition = yearCondition
        ? and(eq(jumps.userUuid, userUuid), yearCondition)
        : eq(jumps.userUuid, userUuid);

    const [resourceRows, recordStatistics] = await Promise.all([
        fetchStatisticsRows(db, userUuid, joinCondition),
        fetchRecordStatistics(db, userUuid, jumpCondition),
    ]);
    const [locationRows, aircraftRows, gearRows, jumpTypeRows] = resourceRows;
    const [
        yearRows,
        longestFreefallRows,
        longestFreefallDistanceRows,
        highestExitRows,
        highestOpeningRows,
        lowestOpeningRows,
        highestAverageSpeedRows,
        [freefallTotals],
    ] = recordStatistics;

    const years = yearRows
        .map((row) => Number(row.year))
        .filter((y): y is number => Number.isInteger(y) && y > 0)
        .sort((a, b) => b - a);

    const totalJumps = await fetchTotalJumps({
        db,
        userUuid,
        yearCondition,
        previousJumpCount: user.options.previousJumpCount,
    });

    return {
        locationRows,
        aircraftRows,
        gearRows,
        jumpTypeRows,
        years,
        totalJumps,
        totalFreefallTime: freefallTotals?.totalFreefallTime ?? 0,
        totalFreefallDistance: freefallTotals?.totalFreefallDistance ?? 0,
        longestFreefall: longestFreefallRows[0]
            ? {
                  ...longestFreefallRows[0],
                  value: formatDuration(longestFreefallRows[0].value),
              }
            : undefined,
        longestFreefallDistance: longestFreefallDistanceRows[0]
            ? {
                  ...longestFreefallDistanceRows[0],
                  value: formatDistance(longestFreefallDistanceRows[0].value),
              }
            : undefined,
        highestExit: highestExitRows[0]
            ? {
                  ...highestExitRows[0],
                  value: formatAltitude(highestExitRows[0].value),
              }
            : undefined,
        highestOpening: highestOpeningRows[0]
            ? {
                  ...highestOpeningRows[0],
                  value: formatAltitude(highestOpeningRows[0].value),
              }
            : undefined,
        lowestOpening: lowestOpeningRows[0]
            ? {
                  ...lowestOpeningRows[0],
                  value: formatAltitude(lowestOpeningRows[0].value),
              }
            : undefined,
        highestAverageSpeed: highestAverageSpeedRows[0]
            ? {
                  ...highestAverageSpeedRows[0],
                  value: formatSpeed(highestAverageSpeedRows[0].value),
              }
            : undefined,
    };
}

async function renderDetailedStatistics(c: AppRequestContext) {
    const app = getAppContext(c);
    const formatNumber = app.numberFormatter();
    const formatDistance = app.distanceFormatter();
    const { year: rawYear } = routes.logbook.statistics.detailed.query(c);
    const year = parseYear(rawYear);
    const filteredByYear = year !== undefined;

    const {
        locationRows,
        aircraftRows,
        gearRows,
        jumpTypeRows,
        years: availableYears,
        totalJumps,
        totalFreefallTime,
        totalFreefallDistance,
        longestFreefall,
        longestFreefallDistance,
        highestExit,
        highestOpening,
        lowestOpening,
        highestAverageSpeed,
    } = await fetchDetailedStatistics(c, year);

    const locationsWithCounts = toStatisticsItems(locationRows, (uuid) =>
        routes.logbook.locations.edit({ uuid }),
    ).filter((item) => getTotalJumpCount(item) > 0);
    const aircraftWithCounts = toStatisticsItems(aircraftRows, (uuid) =>
        routes.logbook.aircraft.edit({ uuid }),
    ).filter((item) => getTotalJumpCount(item) > 0);
    const gearWithCounts = toStatisticsItems(gearRows, (uuid) =>
        routes.logbook.gear.edit({ uuid }),
    ).filter((item) => getTotalJumpCount(item) > 0);
    const jumpTypesWithCounts = toStatisticsItems(jumpTypeRows, (uuid) =>
        routes.logbook.jumpTypes.edit({ uuid }),
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
        <LogbookPage title="Yearly statistics">
            <a
                href={routes.logbook.statistics.index({})}
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
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {year === undefined ? "All Time" : `Jumps from ${year}`}
            </h2>
            {!filteredByYear && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Total jumps include jumps recorded before this logbook.
                </p>
            )}
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <SummaryCard
                    label="Total jumps"
                    value={formatNumber(totalJumps)}
                />
                <SummaryCard
                    label="Total freefall time"
                    value={formatDuration(totalFreefallTime)}
                />
                <SummaryCard
                    label="Total freefall distance"
                    value={formatDistance(totalFreefallDistance)}
                />
            </dl>
            <div className="space-y-6">
                <RecordJumps
                    records={[
                        {
                            label: "Longest freefall time",
                            jump: longestFreefall,
                        },
                        {
                            label: "Longest freefall distance",
                            jump: longestFreefallDistance,
                        },
                        { label: "Highest jump altitude", jump: highestExit },
                        { label: "Highest opening", jump: highestOpening },
                        { label: "Lowest opening", jump: lowestOpening },
                        {
                            label: "Highest freefall speed avg",
                            jump: highestAverageSpeed,
                        },
                    ]}
                />
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

export function register(app: App) {
    app.get(routes.logbook.statistics.detailed.route, renderDetailedStatistics);
}
