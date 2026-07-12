import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { app, getAppContext, type AppRequestContext } from "./app";
import * as routes from "./routes";
import {
    aircrafts,
    gear,
    jumps,
    jumpsToGear,
    jumpTypes,
    jumpsToJumpTypes,
    locations,
} from "./schema";
import { Details } from "./components/ui";
import { LogbookPage } from "./logbook/layout";
import { formatAltitude, type UserOptions } from "./options";
import "./logbook/aircraft";
import "./logbook/detailed-statistics";
import "./logbook/gear";
import "./logbook/jump";
import "./logbook/jump-type";
import "./logbook/location";
import "./logbook/statistics";
import "./logbook/transfer";
function jumpFreefallDistance(jump: {
    exitAltitude: number;
    openingAltitude: number;
}): number {
    return Math.max(0, jump.exitAltitude - jump.openingAltitude);
}

function jumpAvgSpeed(jump: {
    exitAltitude: number;
    openingAltitude: number;
    freefallTime: number;
}): number | null {
    if (jump.freefallTime <= 0) {
        return null;
    }
    return jumpFreefallDistance(jump) / jump.freefallTime;
}

function formatSpeed(
    metersPerSecond: number,
    units: UserOptions["speedUnits"],
): string {
    if (units === "meters-per-second") {
        return `${metersPerSecond.toFixed(1).replace(/\.0$/, "")} m/s`;
    }
    const kmh = Math.round(metersPerSecond * 3.6);
    return `${kmh} km/h`;
}

function formatDistance(
    meters: number,
    units: UserOptions["altitudeUnits"],
): string {
    if (units === "feet") {
        const feet = Math.round(meters / 0.3048);
        return `${feet.toLocaleString("en-US")} ft`;
    }
    const kilometers = meters / 1000;
    const formatted = kilometers.toFixed(1).replace(/\.0$/, "");
    return `${formatted} km`;
}

function formatDuration(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0) {
        return `${seconds} s`;
    }
    if (seconds === 0) {
        return `${minutes} min`;
    }
    return `${minutes} min ${seconds} s`;
}

function LogbookStats(props: {
    totalJumps: number;
    totalFreefallMeters: number;
    options: UserOptions;
}) {
    return (
        <section
            aria-label="Logbook summary"
            className="grid grid-cols-2 gap-4"
        >
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-2">
                    <span
                        aria-hidden="true"
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M3 17l6-6 4 4 8-8M21 7h-4m4 0v4"
                            />
                        </svg>
                    </span>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Total jumps
                    </p>
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                    {props.totalJumps}
                </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-2">
                    <span
                        aria-hidden="true"
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                        </svg>
                    </span>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Total freefall
                    </p>
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                    {formatDistance(
                        props.totalFreefallMeters,
                        props.options.altitudeUnits,
                    )}
                </p>
            </div>
        </section>
    );
}

function JumpStat(props: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {props.label}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-700">
                {props.value}
            </dd>
        </div>
    );
}

interface LogbookJump {
    uuid: string;
    jumpNumber: number;
    jumpDate: string;
    locationName: string;
    aircraftName: string;
    exitAltitude: number;
    openingAltitude: number;
    freefallTime: number;
    description: string | null;
    jumpTypes: string[];
    options: UserOptions;
}

function JumpCard(props: LogbookJump) {
    const avgSpeed = jumpAvgSpeed(props);

    return (
        <li>
            <a
                href={routes.jumpEdit({ uuid: props.uuid })}
                className="block rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-indigo-300 hover:bg-slate-50/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            >
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <div className="flex items-center gap-3">
                        <span className="flex min-w-9 items-center justify-center rounded-xl bg-indigo-100 px-2 py-1.5 text-sm font-bold text-indigo-700 tabular-nums">
                            #{props.jumpNumber}
                        </span>
                        <time
                            dateTime={props.jumpDate}
                            className="text-sm text-slate-500 tabular-nums"
                        >
                            {props.jumpDate}
                        </time>
                        <span className="text-base font-semibold text-slate-900">
                            {props.locationName} / {props.aircraftName}
                        </span>
                    </div>
                    {props.jumpTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {props.jumpTypes.map((name) => (
                                <span
                                    key={name}
                                    className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200/60"
                                >
                                    {name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <JumpStat
                        label="Exit"
                        value={formatAltitude(
                            props.exitAltitude,
                            props.options.altitudeUnits,
                        )}
                    />
                    <JumpStat
                        label="Opening"
                        value={formatAltitude(
                            props.openingAltitude,
                            props.options.altitudeUnits,
                        )}
                    />
                    <JumpStat
                        label="Freefall"
                        value={formatDuration(props.freefallTime)}
                    />
                    <JumpStat
                        label="Avg speed"
                        value={
                            avgSpeed === null
                                ? "—"
                                : formatSpeed(
                                      avgSpeed,
                                      props.options.speedUnits,
                                  )
                        }
                    />
                </dl>
                {props.description && (
                    <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                        {props.description}
                    </p>
                )}
            </a>
        </li>
    );
}

interface LogbookResource {
    uuid: string;
    name: string;
}

interface LogbookFilters {
    locationUuids: string[];
    gearUuids: string[];
    jumpTypeUuids: string[];
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
    if (before !== undefined) {
        query.set("before", String(before));
    }
    const queryString = query.toString();
    return `${routes.logbookJumps({})}${queryString ? `?${queryString}` : ""}`;
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
                    href={routes.logbook({})}
                    className="ml-auto text-sm font-normal text-indigo-600 hover:underline"
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
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            summary={<JumpFiltersSummary hasFilters={hasFilters} />}
            summaryClassName="font-semibold text-slate-900"
        >
            <form
                action={routes.logbook({})}
                method="get"
                className="mt-5 space-y-5"
            >
                <fieldset>
                    <legend className="text-sm font-semibold text-slate-700">
                        Locations
                    </legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {props.locations.map((location) => (
                            <label
                                key={location.uuid}
                                className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900"
                            >
                                <input
                                    name="locationUuids"
                                    type="checkbox"
                                    value={location.uuid}
                                    checked={selectedLocations.has(
                                        location.uuid,
                                    )}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/40"
                                />
                                {location.name}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <fieldset>
                    <legend className="text-sm font-semibold text-slate-700">
                        Gear
                    </legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {props.gear.map((item) => (
                            <label
                                key={item.uuid}
                                className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900"
                            >
                                <input
                                    name="gearUuids"
                                    type="checkbox"
                                    value={item.uuid}
                                    checked={selectedGear.has(item.uuid)}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/40"
                                />
                                {item.name}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <fieldset>
                    <legend className="text-sm font-semibold text-slate-700">
                        Jump types
                    </legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {props.jumpTypes.map((item) => (
                            <label
                                key={item.uuid}
                                className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-900"
                            >
                                <input
                                    name="jumpTypeUuids"
                                    type="checkbox"
                                    value={item.uuid}
                                    checked={selectedJumpTypes.has(item.uuid)}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/40"
                                />
                                {item.name}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <div className="flex flex-wrap gap-3 pt-2">
                    <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    >
                        Apply filters
                    </button>
                </div>
            </form>
        </Details>
    );
}

async function getLogbookFilterResources(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const [locationRows, gearItems, jumpTypeRows] = await Promise.all([
        db
            .select({ uuid: locations.uuid, name: locations.name })
            .from(locations)
            .where(
                and(
                    eq(locations.userUuid, userUuid),
                    eq(locations.archived, false),
                ),
            )
            .orderBy(locations.name),
        db
            .select({ uuid: gear.uuid, name: gear.name })
            .from(gear)
            .where(and(eq(gear.userUuid, userUuid), eq(gear.archived, false)))
            .orderBy(gear.name),
        db
            .select({ uuid: jumpTypes.uuid, name: jumpTypes.name })
            .from(jumpTypes)
            .where(
                and(
                    eq(jumpTypes.userUuid, userUuid),
                    eq(jumpTypes.archived, false),
                ),
            )
            .orderBy(jumpTypes.name),
    ]);

    return {
        locations: locationRows,
        gear: gearItems,
        jumpTypes: jumpTypeRows,
    };
}

function getLogbookFilters(
    c: AppRequestContext,
    resources: Awaited<ReturnType<typeof getLogbookFilterResources>>,
): LogbookFilters {
    const query = new URL(c.req.url).searchParams;
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
    };
}

function getLogbookJumpConditions(
    c: AppRequestContext,
    filters: LogbookFilters,
) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
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
    ];
}

async function getLogbookJumps(
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
    const [stats] = await db
        .select({
            totalJumps: sql<number>`count(*)`,
            totalFreefallMeters: sql<number>`coalesce(sum(max(${jumps.exitAltitude} - ${jumps.openingAltitude}, 0)), 0)`,
        })
        .from(jumps)
        .where(and(...getLogbookJumpConditions(c, filters)));

    return stats ?? { totalJumps: 0, totalFreefallMeters: 0 };
}

async function getJumpTypesByJump(c: AppRequestContext, jumpUuids: string[]) {
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
        .where(
            and(
                inArray(jumpsToJumpTypes.jumpUuid, jumpUuids),
                eq(jumpTypes.archived, false),
            ),
        )
        .orderBy(jumpTypes.name);

    const jumpTypesByJump = new Map<string, string[]>();
    for (const row of rows) {
        const list = jumpTypesByJump.get(row.jumpUuid) ?? [];
        list.push(row.name);
        jumpTypesByJump.set(row.jumpUuid, list);
    }
    return jumpTypesByJump;
}

function JumpList(props: { jumps: LogbookJump[]; filters: LogbookFilters }) {
    const hasMoreJumps = props.jumps.length > JUMPS_PER_PAGE;
    const visibleJumps = props.jumps.slice(0, JUMPS_PER_PAGE);
    const lastVisibleJump = visibleJumps.at(-1);

    return (
        <>
            {visibleJumps.map((jump) => (
                <JumpCard {...jump} />
            ))}
            {hasMoreJumps && lastVisibleJump && (
                <li
                    hx-get={getLogbookJumpsUrl(
                        props.filters,
                        lastVisibleJump.jumpNumber,
                    )}
                    hx-trigger="intersect once"
                    hx-swap="outerHTML"
                    className="col-span-full py-4 text-center text-sm text-slate-400"
                >
                    Loading more jumps...
                </li>
            )}
        </>
    );
}

function getFragmentBefore(c: AppRequestContext): number | undefined {
    const value = new URL(c.req.url).searchParams.get("before");
    if (value === null || !/^\d+$/.test(value)) {
        return undefined;
    }
    const before = Number(value);
    return Number.isSafeInteger(before) && before > 0 ? before : undefined;
}

async function renderLogbookJumps(c: AppRequestContext) {
    const options = getAppContext(c).getUser().options;
    const resources = await getLogbookFilterResources(c);
    const filters = getLogbookFilters(c, resources);
    const jumpRows = await getLogbookJumps(c, filters, getFragmentBefore(c));
    const jumpTypesByJump = await getJumpTypesByJump(
        c,
        jumpRows.map((jump) => jump.uuid),
    );
    const jumpCards = jumpRows.map((jump) => ({
        ...jump,
        jumpTypes: jumpTypesByJump.get(jump.uuid) ?? [],
        options,
    }));

    return c.render(<JumpList jumps={jumpCards} filters={filters} />);
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
        <LogbookPage title="Jump Logbook">
            {stats.totalJumps > 0 && (
                <>
                    <div className="flex justify-end">
                        <a
                            href={routes.logbookStatistics({})}
                            className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-indigo-600"
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
                        options={options}
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
                    <h2 className="text-lg font-semibold text-slate-900">
                        Jumps
                    </h2>
                    {stats.totalJumps > 0 && (
                        <span className="text-sm text-slate-400">
                            {stats.totalJumps} total
                        </span>
                    )}
                </div>
                {stats.totalJumps === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                        <p className="text-sm text-slate-500">
                            {filters.locationUuids.length > 0 ||
                            filters.gearUuids.length > 0 ||
                            filters.jumpTypeUuids.length > 0
                                ? "No jumps match the selected filters."
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

app.get(routes.logbook.route, renderLogbook);
app.get(routes.logbookJumps.route, renderLogbookJumps);
