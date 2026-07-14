import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import * as routes from "@/routes";
import {
    aircrafts,
    gear,
    jumps,
    jumpsToGear,
    jumpTypes,
    jumpsToJumpTypes,
    locations,
} from "@/schema";
import { Button } from "@/components/form";
import { Details } from "@/components/ui/details";
import { LogbookPage } from "@/app/authenticated-page";
import {
    Distance,
    formatDuration,
    JumpCard,
    type JumpListItem,
} from "@/route-handlers/logbook/components/jump-list";
import { JumpSearch } from "@/route-handlers/logbook/components/search";

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
                <fieldset>
                    <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Locations
                    </legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {props.locations.map((location) => (
                            <label
                                key={location.uuid}
                                className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/60 dark:has-[:checked]:border-indigo-500 dark:has-[:checked]:bg-indigo-900/40 dark:has-[:checked]:text-indigo-200"
                            >
                                <input
                                    name="locationUuids"
                                    type="checkbox"
                                    value={location.uuid}
                                    checked={selectedLocations.has(
                                        location.uuid,
                                    )}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-600 dark:text-indigo-500 dark:focus:ring-indigo-400/40"
                                />
                                {location.name}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <fieldset>
                    <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Gear
                    </legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {props.gear.map((item) => (
                            <label
                                key={item.uuid}
                                className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/60 dark:has-[:checked]:border-indigo-500 dark:has-[:checked]:bg-indigo-900/40 dark:has-[:checked]:text-indigo-200"
                            >
                                <input
                                    name="gearUuids"
                                    type="checkbox"
                                    value={item.uuid}
                                    checked={selectedGear.has(item.uuid)}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-600 dark:text-indigo-500 dark:focus:ring-indigo-400/40"
                                />
                                {item.name}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <fieldset>
                    <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Jump types
                    </legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {props.jumpTypes.map((item) => (
                            <label
                                key={item.uuid}
                                className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/60 dark:has-[:checked]:border-indigo-500 dark:has-[:checked]:bg-indigo-900/40 dark:has-[:checked]:text-indigo-200"
                            >
                                <input
                                    name="jumpTypeUuids"
                                    type="checkbox"
                                    value={item.uuid}
                                    checked={selectedJumpTypes.has(item.uuid)}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-600 dark:text-indigo-500 dark:focus:ring-indigo-400/40"
                                />
                                {item.name}
                            </label>
                        ))}
                    </div>
                </fieldset>
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
            .select({ uuid: locations.uuid, name: locations.name })
            .from(locations)
            .where(eq(locations.userUuid, userUuid))
            .orderBy(locations.name),
        db
            .select({ uuid: gear.uuid, name: gear.name })
            .from(gear)
            .where(eq(gear.userUuid, userUuid))
            .orderBy(gear.name),
        db
            .select({ uuid: jumpTypes.uuid, name: jumpTypes.name })
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
                      sql`CAST(${jumps.exitAltitude} AS TEXT) LIKE ${searchPattern} ESCAPE '\\'`,
                      sql`CAST(${jumps.openingAltitude} AS TEXT) LIKE ${searchPattern} ESCAPE '\\'`,
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
            locationName: locations.name,
            aircraftName: aircrafts.name,
        })
        .from(jumps)
        .innerJoin(locations, eq(jumps.locationUuid, locations.uuid))
        .innerJoin(aircrafts, eq(jumps.aircraftUuid, aircrafts.uuid))
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
    const jumpTypesByJump = await getJumpTypesByJump(
        c,
        jumpRows.map((jump) => jump.uuid),
    );
    const jumpCards = jumpRows.map((jump) => ({
        ...jump,
        jumpTypes: jumpTypesByJump.get(jump.uuid) ?? [],
        options,
    }));

    return c.render(
        <LogbookPage title="Loki - Skydiving Logbook">
            {stats.totalJumps > 0 && (
                <>
                    <div className="flex justify-end">
                        <a
                            href={routes.logbook.statistics.index({})}
                            className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                        >
                            View statistics
                            <svg
                                aria-hidden="true"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </a>
                    </div>
                    <LogbookStats
                        totalJumps={stats.totalJumps}
                        totalFreefallMeters={stats.totalFreefallMeters}
                        totalFreefallTime={stats.totalFreefallTime}
                        activeJumpYears={stats.activeJumpYears}
                    />
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
