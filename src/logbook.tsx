import { and, desc, eq, inArray } from "drizzle-orm";
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
import { LogbookPage } from "./logbook/layout";
import "./logbook/aircraft";
import "./logbook/gear";
import "./logbook/jump";
import "./logbook/jump-type";
import "./logbook/location";
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

function formatSpeed(metersPerSecond: number): string {
    const kmh = Math.round(metersPerSecond * 3.6);
    return `${kmh} km/h`;
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

function LogbookStats(props: { totalJumps: number; avgSpeed: number | null }) {
    return (
        <section
            aria-label="Logbook summary"
            className="grid grid-cols-2 gap-3 rounded-lg bg-white p-5 shadow-sm sm:grid-cols-2"
        >
            <div>
                <p className="text-sm font-medium text-gray-500">Total jumps</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                    {props.totalJumps}
                </p>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">
                    Avg skydiving speed
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                    {props.avgSpeed === null
                        ? "—"
                        : formatSpeed(props.avgSpeed)}
                </p>
            </div>
        </section>
    );
}

function JumpStat(props: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {props.label}
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900">
                {props.value}
            </dd>
        </div>
    );
}

function JumpCard(props: {
    uuid: string;
    jumpNumber: number;
    locationName: string;
    aircraftName: string;
    exitAltitude: number;
    openingAltitude: number;
    freefallTime: number;
    description: string | null;
    jumpTypes: string[];
}) {
    const avgSpeed = jumpAvgSpeed(props);

    return (
        <li>
            <a
                href={routes.jumpEdit({ uuid: props.uuid })}
                className="block px-5 py-4 hover:bg-gray-50"
            >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="font-semibold text-blue-700">
                        Jump #{props.jumpNumber}
                    </span>
                    <span className="text-sm text-gray-600">
                        {props.locationName} / {props.aircraftName}
                    </span>
                </div>
                {props.jumpTypes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {props.jumpTypes.map((name) => (
                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                                {name}
                            </span>
                        ))}
                    </div>
                )}
                <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <JumpStat label="Exit" value={`${props.exitAltitude} m`} />
                    <JumpStat
                        label="Opening"
                        value={`${props.openingAltitude} m`}
                    />
                    <JumpStat
                        label="Freefall"
                        value={formatDuration(props.freefallTime)}
                    />
                    <JumpStat
                        label="Avg speed"
                        value={avgSpeed === null ? "—" : formatSpeed(avgSpeed)}
                    />
                </dl>
                {props.description && (
                    <p className="mt-2 text-sm text-gray-600">
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
        <details
            open={hasFilters}
            className="rounded-lg bg-white p-5 shadow-sm"
        >
            <summary className="cursor-pointer font-semibold text-gray-900">
                Filter jumps
            </summary>
            <form
                action={routes.logbook({})}
                method="get"
                className="mt-5 space-y-5"
            >
                <fieldset>
                    <legend className="text-sm font-medium text-gray-700">
                        Locations
                    </legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {props.locations.map((location) => (
                            <label className="flex items-center gap-2 rounded border border-gray-200 px-3 py-2 text-sm">
                                <input
                                    name="locationUuids"
                                    type="checkbox"
                                    value={location.uuid}
                                    checked={selectedLocations.has(
                                        location.uuid,
                                    )}
                                />
                                {location.name}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <fieldset>
                    <legend className="text-sm font-medium text-gray-700">
                        Gear
                    </legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {props.gear.map((item) => (
                            <label className="flex items-center gap-2 rounded border border-gray-200 px-3 py-2 text-sm">
                                <input
                                    name="gearUuids"
                                    type="checkbox"
                                    value={item.uuid}
                                    checked={selectedGear.has(item.uuid)}
                                />
                                {item.name}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <fieldset>
                    <legend className="text-sm font-medium text-gray-700">
                        Jump types
                    </legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {props.jumpTypes.map((item) => (
                            <label className="flex items-center gap-2 rounded border border-gray-200 px-3 py-2 text-sm">
                                <input
                                    name="jumpTypeUuids"
                                    type="checkbox"
                                    value={item.uuid}
                                    checked={selectedJumpTypes.has(item.uuid)}
                                />
                                {item.name}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <div className="flex flex-wrap gap-3">
                    <button
                        type="submit"
                        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                    >
                        Apply filters
                    </button>
                    {hasFilters && (
                        <a
                            href={routes.logbook({})}
                            className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Clear filters
                        </a>
                    )}
                </div>
            </form>
        </details>
    );
}

async function getLogbookFilterResources(c: AppRequestContext) {
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

async function getLogbookJumps(c: AppRequestContext, filters: LogbookFilters) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const conditions = [
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
    return db
        .select({
            uuid: jumps.uuid,
            jumpNumber: jumps.jumpNumber,
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
        .orderBy(desc(jumps.jumpNumber));
}

async function getJumpTypesByJump(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const rows = await db
        .select({
            jumpUuid: jumpsToJumpTypes.jumpUuid,
            name: jumpTypes.name,
        })
        .from(jumpsToJumpTypes)
        .innerJoin(jumpTypes, eq(jumpsToJumpTypes.jumpTypeUuid, jumpTypes.uuid))
        .innerJoin(jumps, eq(jumpsToJumpTypes.jumpUuid, jumps.uuid))
        .where(eq(jumps.userUuid, userUuid))
        .orderBy(jumpTypes.name);

    const jumpTypesByJump = new Map<string, string[]>();
    for (const row of rows) {
        const list = jumpTypesByJump.get(row.jumpUuid) ?? [];
        list.push(row.name);
        jumpTypesByJump.set(row.jumpUuid, list);
    }
    return jumpTypesByJump;
}

function getOverallAvgSpeed(
    jumpRows: {
        exitAltitude: number;
        openingAltitude: number;
        freefallTime: number;
    }[],
): number | null {
    let totalFreefallDistance = 0;
    let totalFreefallTime = 0;
    for (const jump of jumpRows) {
        if (jump.freefallTime > 0) {
            totalFreefallDistance += jumpFreefallDistance(jump);
            totalFreefallTime += jump.freefallTime;
        }
    }
    return totalFreefallTime > 0
        ? totalFreefallDistance / totalFreefallTime
        : null;
}

async function renderLogbook(c: AppRequestContext) {
    const resources = await getLogbookFilterResources(c);
    const filters = getLogbookFilters(c, resources);
    const [jumpRows, jumpTypesByJump] = await Promise.all([
        getLogbookJumps(c, filters),
        getJumpTypesByJump(c),
    ]);
    const overallAvgSpeed = getOverallAvgSpeed(jumpRows);

    return c.render(
        <LogbookPage title="Jump Logbook">
            {jumpRows.length > 0 && (
                <LogbookStats
                    totalJumps={jumpRows.length}
                    avgSpeed={overallAvgSpeed}
                />
            )}
            <JumpFilters
                filters={filters}
                locations={resources.locations}
                gear={resources.gear}
                jumpTypes={resources.jumpTypes}
            />
            <section className="overflow-hidden rounded-lg bg-white shadow-sm">
                <h2 className="border-b border-gray-200 px-5 py-4 text-lg font-semibold">
                    Jumps
                </h2>
                {jumpRows.length === 0 ? (
                    <p className="p-5 text-gray-600">
                        {filters.locationUuids.length > 0 ||
                        filters.gearUuids.length > 0 ||
                        filters.jumpTypeUuids.length > 0
                            ? "No jumps match the selected filters."
                            : "No jumps yet."}
                    </p>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {jumpRows.map((jump) => (
                            <JumpCard
                                uuid={jump.uuid}
                                jumpNumber={jump.jumpNumber}
                                locationName={jump.locationName}
                                aircraftName={jump.aircraftName}
                                exitAltitude={jump.exitAltitude}
                                openingAltitude={jump.openingAltitude}
                                freefallTime={jump.freefallTime}
                                description={jump.description}
                                jumpTypes={jumpTypesByJump.get(jump.uuid) ?? []}
                            />
                        ))}
                    </ul>
                )}
            </section>
        </LogbookPage>,
    );
}

app.get(routes.logbook.route, renderLogbook);
