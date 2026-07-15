import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import * as routes from "@/routes";
import {
    aircrafts,
    gear,
    jumps,
    jumpsToAircrafts,
    jumpsToGear,
    jumpTypes,
    jumpsToJumpTypes,
    locations,
} from "@/schema";
import { Button } from "@/components/form";
import { ChevronRightIcon } from "@/components/icons";
import { Details } from "@/components/ui/details";
import { LogbookPage } from "@/app/authenticated-page";
import {
    Distance,
    formatDuration,
    JumpCard,
    type JumpListItem,
} from "@/route-handlers/logbook/components/jump-list";
import { JumpSearch } from "@/route-handlers/logbook/components/search";
import { JumpItemSelect } from "@/components/jump-item-select";

function LogbookStatsCard(props: { label: string; value: any }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-black/30">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {props.label}
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {props.value}
            </p>
        </div>
    );
}

function LogbookStats(props: {
    totalJumps: number;
    totalFreefallMeters: number;
    totalFreefallTime: number;
    activeJumpYears: number;
}) {
    return (
        <section
            aria-label="Logbook summary"
            className="grid grid-cols-2 gap-4"
        >
            <LogbookStatsCard label="Total jumps" value={props.totalJumps} />
            <LogbookStatsCard
                label="Total freefall"
                value={<Distance meters={props.totalFreefallMeters} />}
            />
            <LogbookStatsCard
                label="Total freefall time"
                value={formatDuration(props.totalFreefallTime)}
            />
            <LogbookStatsCard
                label="Active jump years"
                value={props.activeJumpYears}
            />
        </section>
    );
}

interface LogbookResource {
    uuid: string;
    name: string;
    archived: boolean;
    description: string | null;
}

export interface LogbookFilters {
    locationUuids: string[];
    gearUuids: string[];
    jumpTypeUuids: string[];
    search: string;
}

const JUMPS_PER_PAGE = 24;

function getLogbookJumpsUrl(filters: LogbookFilters, before?: number): string {
    const query = new URLSearchParams();
    for (const uuid of filters.locationUuids) {
        query.append("locationUuids", uuid);
    }
    for (const uuid of filters.gearUuids) {
        query.append("gearUuids", uuid);
    }
    for (const uuid of filters.jumpTypeUuids) {
        query.append("jumpTypeUuids", uuid);
    }
    if (filters.search) {
        query.set("search", filters.search);
    }
    if (before !== undefined) {
        query.set("before", String(before));
    }
    const queryString = query.toString();
    return `${routes.logbook.jumpFragment({})}${queryString ? `?${queryString}` : ""}`;
}

function filterResourceUuids(
    query: URLSearchParams,
    name: string,
    resources: LogbookResource[],
): string[] {
    const resourceUuids = new Set(resources.map((resource) => resource.uuid));
    return [...new Set(query.getAll(name))].filter((uuid) =>
        resourceUuids.has(uuid),
    );
}

function JumpFiltersSummary(props: { hasFilters: boolean }) {
    return (
        <>
            Filter jumps
            {props.hasFilters && (
                <a
                    href={routes.logbook.index({})}
                    className="ml-auto text-sm font-normal text-indigo-600 hover:underline dark:text-indigo-400"
                >
                    Clear filters
                </a>
            )}
        </>
    );
}

function JumpFilters(props: {
    filters: LogbookFilters;
    locations: LogbookResource[];
    gear: LogbookResource[];
    jumpTypes: LogbookResource[];
}) {
    const selectedLocations = new Set(props.filters.locationUuids);
    const selectedGear = new Set(props.filters.gearUuids);
    const selectedJumpTypes = new Set(props.filters.jumpTypeUuids);
    const hasFilters =
        selectedLocations.size > 0 ||
        selectedGear.size > 0 ||
        selectedJumpTypes.size > 0;

    return (
        <Details
            open={hasFilters}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            summary={<JumpFiltersSummary hasFilters={hasFilters} />}
            summaryClassName="font-semibold text-slate-900 dark:text-slate-100"
        >
            <form
                action={routes.logbook.index({})}
                method="get"
                className="mt-5 space-y-5"
            >
                {props.filters.search !== "" && (
                    <input
                        type="hidden"
                        name="search"
                        value={props.filters.search}
                    />
                )}
                <JumpItemSelect
                    label="Locations"
                    dialogTitle="Select locations"
                    name="locationUuids"
                    items={props.locations}
                    selectedUuids={selectedLocations}
                    multiple
                />
                <JumpItemSelect
                    label="Gear"
                    dialogTitle="Select gear"
                    name="gearUuids"
                    items={props.gear}
                    selectedUuids={selectedGear}
                    multiple
                />
                <JumpItemSelect
                    label="Jump types"
                    dialogTitle="Select jump types"
                    name="jumpTypeUuids"
                    items={props.jumpTypes}
                    selectedUuids={selectedJumpTypes}
                    multiple
                />
                <div className="flex flex-wrap gap-3 pt-2">
                    <Button type="submit" variant="primary">
                        Apply filters
                    </Button>
                </div>
            </form>
        </Details>
    );
}

export async function getLogbookFilterResources(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const [locationRows, gearItems, jumpTypeRows] = await Promise.all([
        db
            .select({
                uuid: locations.uuid,
                name: locations.name,
                archived: locations.archived,
                description: locations.description,
            })
            .from(locations)
            .where(eq(locations.userUuid, userUuid))
            .orderBy(locations.name),
        db
            .select({
                uuid: gear.uuid,
                name: gear.name,
                archived: gear.archived,
                description: gear.description,
            })
            .from(gear)
            .where(eq(gear.userUuid, userUuid))
            .orderBy(gear.name),
        db
            .select({
                uuid: jumpTypes.uuid,
                name: jumpTypes.name,
                archived: jumpTypes.archived,
                description: jumpTypes.description,
            })
            .from(jumpTypes)
            .where(eq(jumpTypes.userUuid, userUuid))
            .orderBy(jumpTypes.name),
    ]);

    return {
        locations: locationRows,
        gear: gearItems,
        jumpTypes: jumpTypeRows,
    };
}

export function getLogbookFilters(
    c: AppRequestContext,
    resources: Awaited<ReturnType<typeof getLogbookFilterResources>>,
): LogbookFilters {
    const query = new URL(c.req.url).searchParams;
    const search = (query.get("search") ?? "").trim().slice(0, 200);
    return {
        locationUuids: filterResourceUuids(
            query,
            "locationUuids",
            resources.locations,
        ),
        gearUuids: filterResourceUuids(query, "gearUuids", resources.gear),
        jumpTypeUuids: filterResourceUuids(
            query,
            "jumpTypeUuids",
            resources.jumpTypes,
        ),
        search,
    };
}

function getLogbookJumpConditions(
    c: AppRequestContext,
    filters: LogbookFilters,
) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const searchPattern = filters.search
        ? `%${filters.search.replace(/[%_\\]/g, "\\$&")}%`
        : null;
    const altitudeUnits = getAppContext(c).getUser().options.altitudeUnits;
    const exitAltitudeText =
        altitudeUnits === "feet"
            ? sql`CAST(CAST(ROUND(${jumps.exitAltitude} / 0.3048) AS INTEGER) AS TEXT)`
            : sql`CAST(${jumps.exitAltitude} AS TEXT)`;
    const openingAltitudeText =
        altitudeUnits === "feet"
            ? sql`CAST(CAST(ROUND(${jumps.openingAltitude} / 0.3048) AS INTEGER) AS TEXT)`
            : sql`CAST(${jumps.openingAltitude} AS TEXT)`;
    return [
        eq(jumps.userUuid, userUuid),
        ...(filters.locationUuids.length > 0
            ? [inArray(jumps.locationUuid, filters.locationUuids)]
            : []),
        ...(filters.gearUuids.length > 0
            ? [
                  inArray(
                      jumps.uuid,
                      db
                          .select({ jumpUuid: jumpsToGear.jumpUuid })
                          .from(jumpsToGear)
                          .where(
                              inArray(jumpsToGear.gearUuid, filters.gearUuids),
                          ),
                  ),
              ]
            : []),
        ...(filters.jumpTypeUuids.length > 0
            ? [
                  inArray(
                      jumps.uuid,
                      db
                          .select({ jumpUuid: jumpsToJumpTypes.jumpUuid })
                          .from(jumpsToJumpTypes)
                          .where(
                              inArray(
                                  jumpsToJumpTypes.jumpTypeUuid,
                                  filters.jumpTypeUuids,
                              ),
                          ),
                  ),
              ]
            : []),
        ...(searchPattern
            ? [
                  or(
                      sql`CAST(${jumps.jumpNumber} AS TEXT) LIKE ${searchPattern} ESCAPE '\\'`,
                      sql`${jumps.jumpDate} LIKE ${searchPattern} ESCAPE '\\'`,
                      sql`${exitAltitudeText} LIKE ${searchPattern} ESCAPE '\\'`,
                      sql`${openingAltitudeText} LIKE ${searchPattern} ESCAPE '\\'`,
                      sql`CAST(${jumps.freefallTime} AS TEXT) LIKE ${searchPattern} ESCAPE '\\'`,
                      sql`${jumps.description} LIKE ${searchPattern} ESCAPE '\\'`,
                  )!,
              ]
            : []),
    ];
}

export async function getLogbookJumps(
    c: AppRequestContext,
    filters: LogbookFilters,
    before?: number,
) {
    const db = getAppContext(c).db;
    const conditions = [
        ...getLogbookJumpConditions(c, filters),
        ...(before === undefined ? [] : [lt(jumps.jumpNumber, before)]),
    ];
    return db
        .select({
            uuid: jumps.uuid,
            jumpNumber: jumps.jumpNumber,
            jumpDate: jumps.jumpDate,
            exitAltitude: jumps.exitAltitude,
            openingAltitude: jumps.openingAltitude,
            freefallTime: jumps.freefallTime,
            description: jumps.description,
            locationName: sql<string>`coalesce(${locations.name}, 'Not set')`,
        })
        .from(jumps)
        .leftJoin(locations, eq(jumps.locationUuid, locations.uuid))
        .where(and(...conditions))
        .orderBy(desc(jumps.jumpNumber))
        .limit(JUMPS_PER_PAGE + 1);
}

async function getLogbookStats(c: AppRequestContext, filters: LogbookFilters) {
    const db = getAppContext(c).db;
    const previousJumpCount =
        getAppContext(c).getUser().options.previousJumpCount;
    const [stats] = await db
        .select({
            totalJumps: sql<number>`count(*) + ${previousJumpCount}`,
            totalFreefallMeters: sql<number>`coalesce(sum(max(${jumps.exitAltitude} - ${jumps.openingAltitude}, 0)), 0)`,
            totalFreefallTime: sql<number>`coalesce(sum(${jumps.freefallTime}), 0)`,
            activeJumpYears: sql<number>`count(distinct substr(${jumps.jumpDate}, 1, 4))`,
        })
        .from(jumps)
        .where(and(...getLogbookJumpConditions(c, filters)));

    return (
        stats ?? {
            totalJumps: 0,
            totalFreefallMeters: 0,
            totalFreefallTime: 0,
            activeJumpYears: 0,
        }
    );
}

export async function getJumpTypesByJump(
    c: AppRequestContext,
    jumpUuids: string[],
) {
    if (jumpUuids.length === 0) {
        return new Map<string, string[]>();
    }

    const db = getAppContext(c).db;
    const rows = await db
        .select({
            jumpUuid: jumpsToJumpTypes.jumpUuid,
            name: jumpTypes.name,
        })
        .from(jumpsToJumpTypes)
        .innerJoin(jumpTypes, eq(jumpsToJumpTypes.jumpTypeUuid, jumpTypes.uuid))
        .where(inArray(jumpsToJumpTypes.jumpUuid, jumpUuids))
        .orderBy(jumpTypes.name);

    const jumpTypesByJump = new Map<string, string[]>();
    for (const row of rows) {
        const list = jumpTypesByJump.get(row.jumpUuid) ?? [];
        list.push(row.name);
        jumpTypesByJump.set(row.jumpUuid, list);
    }
    return jumpTypesByJump;
}

export async function getAircraftsByJump(
    c: AppRequestContext,
    jumpUuids: string[],
) {
    if (jumpUuids.length === 0) {
        return new Map<string, string[]>();
    }
    const rows = await getAppContext(c)
        .db.select({
            jumpUuid: jumpsToAircrafts.jumpUuid,
            name: aircrafts.name,
        })
        .from(jumpsToAircrafts)
        .innerJoin(aircrafts, eq(jumpsToAircrafts.aircraftUuid, aircrafts.uuid))
        .where(inArray(jumpsToAircrafts.jumpUuid, jumpUuids))
        .orderBy(aircrafts.name);
    const aircraftsByJump = new Map<string, string[]>();
    for (const row of rows) {
        const list = aircraftsByJump.get(row.jumpUuid) ?? [];
        list.push(row.name);
        aircraftsByJump.set(row.jumpUuid, list);
    }
    return aircraftsByJump;
}

export function JumpList(props: {
    jumps: JumpListItem[];
    filters: LogbookFilters;
}) {
    const hasMoreJumps = props.jumps.length > JUMPS_PER_PAGE;
    const visibleJumps = props.jumps.slice(0, JUMPS_PER_PAGE);
    const lastVisibleJump = visibleJumps.at(-1);

    return (
        <>
            {visibleJumps.map((jump) => (
                <JumpCard {...jump} key={jump.uuid} />
            ))}
            {hasMoreJumps && lastVisibleJump && (
                <li
                    hx-get={getLogbookJumpsUrl(
                        props.filters,
                        lastVisibleJump.jumpNumber,
                    )}
                    hx-trigger="intersect once"
                    hx-swap="outerHTML"
                    className="col-span-full py-4 text-center text-sm text-slate-400 dark:text-slate-500"
                >
                    Loading more jumps...
                </li>
            )}
        </>
    );
}

async function renderLogbook(c: AppRequestContext) {
    const options = getAppContext(c).getUser().options;
    const resources = await getLogbookFilterResources(c);
    const filters = getLogbookFilters(c, resources);
    const [stats, jumpRows] = await Promise.all([
        getLogbookStats(c, filters),
        getLogbookJumps(c, filters),
    ]);
    const jumpUuids = jumpRows.map((jump) => jump.uuid);
    const [aircraftsByJump, jumpTypesByJump] = await Promise.all([
        getAircraftsByJump(c, jumpUuids),
        getJumpTypesByJump(c, jumpUuids),
    ]);
    const jumpCards = jumpRows.map((jump) => ({
        ...jump,
        aircraftNames: aircraftsByJump.get(jump.uuid) ?? [],
        jumpTypes: jumpTypesByJump.get(jump.uuid) ?? [],
        options,
    }));

    return c.render(
        <LogbookPage title="Your Jumps">
            {stats.totalJumps > 0 && (
                <>
                    <LogbookStats
                        totalJumps={stats.totalJumps}
                        totalFreefallMeters={stats.totalFreefallMeters}
                        totalFreefallTime={stats.totalFreefallTime}
                        activeJumpYears={stats.activeJumpYears}
                    />
                    <div className="flex justify-end">
                        <a
                            href={routes.logbook.statistics.index({})}
                            className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                        >
                            View all statistics
                            <ChevronRightIcon className="h-4 w-4" />
                        </a>
                    </div>
                </>
            )}
            <JumpFilters
                filters={filters}
                locations={resources.locations}
                gear={resources.gear}
                jumpTypes={resources.jumpTypes}
            />
            <section className="space-y-3">
                <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Jumps
                    </h2>
                    {stats.totalJumps > 0 && (
                        <span className="text-sm text-slate-400 dark:text-slate-500">
                            {stats.totalJumps} total
                        </span>
                    )}
                </div>
                {(stats.totalJumps > 0 || filters.search !== "") && (
                    <JumpSearch filters={filters} />
                )}
                {stats.totalJumps === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {filters.locationUuids.length > 0 ||
                            filters.gearUuids.length > 0 ||
                            filters.jumpTypeUuids.length > 0 ||
                            filters.search !== ""
                                ? "No jumps match the selected filters or search."
                                : "No jumps yet. Add your first jump to start your logbook."}
                        </p>
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <JumpList jumps={jumpCards} filters={filters} />
                    </ul>
                )}
            </section>
        </LogbookPage>,
    );
}

export function register(app: App) {
    app.get(routes.logbook.index.route, renderLogbook);
}
