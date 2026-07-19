import { and, asc, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
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
import { Details } from "@/components/ui/details";
import { LogbookPage } from "@/app/logbook-page";
import {
    JumpCard,
    type JumpCardItem,
    type JumpListItem,
} from "@/route-handlers/logbook/components/jump-list";
import { MissingJumpCard } from "@/route-handlers/logbook/jumps/gaps";
import {
    appendLogbookFilterParams,
    buildLogbookUrl,
    isDefaultLogbookSort,
    JumpSearch,
    logbookSortParam,
} from "@/route-handlers/logbook/components/search";
import { JumpItemSelect } from "@/components/jump-item-select";
import { DateInput } from "@/components/date-input";

interface LogbookResource {
    uuid: string;
    name: string;
    archived: boolean;
    description: string | null;
}

export type LogbookSortBy = "jumpNumber" | "createdAt";
export type LogbookSortOrder = "asc" | "desc";

export interface LogbookFilters {
    locationUuids: string[];
    gearUuids: string[];
    jumpTypeUuids: string[];
    start: string;
    end: string;
    search: string;
    sortBy: LogbookSortBy;
    sortOrder: LogbookSortOrder;
}

const JUMPS_PER_PAGE = 24;

function getLogbookJumpsUrl(filters: LogbookFilters, offset?: number): string {
    const query = new URLSearchParams();
    appendLogbookFilterParams(query, filters);
    if (offset !== undefined && offset > 0) {
        query.set("offset", String(offset));
    }
    const queryString = query.toString();
    return `${routes.logbook.jumpFragment({})}${queryString ? `?${queryString}` : ""}`;
}

function parseLogbookSort(value: string | null): {
    sortBy: LogbookSortBy;
    sortOrder: LogbookSortOrder;
} {
    if (value === "jumpNumber-asc") {
        return { sortBy: "jumpNumber", sortOrder: "asc" };
    }
    if (value === "createdAt-desc") {
        return { sortBy: "createdAt", sortOrder: "desc" };
    }
    if (value === "createdAt-asc") {
        return { sortBy: "createdAt", sortOrder: "asc" };
    }
    return { sortBy: "jumpNumber", sortOrder: "desc" };
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
            Filters
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
        selectedJumpTypes.size > 0 ||
        props.filters.start !== "" ||
        props.filters.end !== "";

    return (
        <Details
            open={hasFilters}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            summary={<JumpFiltersSummary hasFilters={hasFilters} />}
            summaryClassName="h-10 px-4 font-semibold text-slate-900 dark:text-slate-100"
        >
            <form
                action={routes.logbook.index({})}
                method="get"
                className="mx-5 mb-5 mt-3 space-y-5"
            >
                {props.filters.search !== "" && (
                    <input
                        type="hidden"
                        name="search"
                        value={props.filters.search}
                    />
                )}
                {!isDefaultLogbookSort(props.filters) && (
                    <input
                        type="hidden"
                        name="sort"
                        value={logbookSortParam(props.filters)}
                    />
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                    <DateInput
                        label="Start date"
                        name="start"
                        value={props.filters.start}
                    />
                    <DateInput
                        label="End date"
                        name="end"
                        value={props.filters.end}
                    />
                </div>
                <JumpItemSelect
                    label="Locations"
                    dialogTitle="Select locations"
                    description={
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Locations can be edited on the{" "}
                            <a
                                href={routes.logbook.locations.index({})}
                                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                                Manage locations
                            </a>{" "}
                            page.
                        </p>
                    }
                    name="locationUuids"
                    items={props.locations}
                    selectedUuids={selectedLocations}
                    multiple
                />
                <JumpItemSelect
                    label="Gear"
                    dialogTitle="Select gear"
                    description={
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Gear can be edited on the{" "}
                            <a
                                href={routes.logbook.gear.index({})}
                                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                                Manage gear
                            </a>{" "}
                            page.
                        </p>
                    }
                    name="gearUuids"
                    items={props.gear}
                    selectedUuids={selectedGear}
                    multiple
                />
                <JumpItemSelect
                    label="Jump types"
                    dialogTitle="Select jump types"
                    description={
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Jump types can be edited on the{" "}
                            <a
                                href={routes.logbook.jumpTypes.index({})}
                                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                                Manage jump types
                            </a>{" "}
                            page.
                        </p>
                    }
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
    const { sortBy, sortOrder } = parseLogbookSort(query.get("sort"));
    function getDate(name: string): string {
        const value = query.get(name) ?? "";
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
        const date = new Date(`${value}T00:00:00Z`);
        if (Number.isNaN(date.getTime())) return "";
        return date.toISOString().slice(0, 10) === value ? value : "";
    }
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
        start: getDate("start"),
        end: getDate("end"),
        search,
        sortBy,
        sortOrder,
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
        ...(filters.start ? [gte(jumps.jumpDate, filters.start)] : []),
        ...(filters.end ? [lte(jumps.jumpDate, filters.end)] : []),
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
    offset = 0,
) {
    const db = getAppContext(c).db;
    const searchedJumpNumber = /^\d+$/.test(filters.search)
        ? Number(filters.search)
        : undefined;
    const validSearchedJumpNumber = Number.isSafeInteger(searchedJumpNumber)
        ? searchedJumpNumber
        : undefined;
    const orderFn = filters.sortOrder === "asc" ? asc : desc;
    const primaryOrder =
        filters.sortBy === "createdAt" ? jumps.createdAt : jumps.jumpNumber;
    const secondaryOrder =
        filters.sortBy === "createdAt" ? jumps.jumpNumber : jumps.createdAt;
    const conditions = getLogbookJumpConditions(c, filters);
    return db
        .select({
            uuid: jumps.uuid,
            jumpNumber: jumps.jumpNumber,
            jumpDate: jumps.jumpDate,
            createdAt: jumps.createdAt,
            exitAltitude: jumps.exitAltitude,
            openingAltitude: jumps.openingAltitude,
            freefallTime: jumps.freefallTime,
            description: jumps.description,
            locationName: sql<string>`coalesce(${locations.name}, 'Not set')`,
            locationDescription: locations.description,
        })
        .from(jumps)
        .leftJoin(locations, eq(jumps.locationUuid, locations.uuid))
        .where(and(...conditions))
        .orderBy(
            ...(offset === 0 && validSearchedJumpNumber !== undefined
                ? [
                      asc(
                          sql`CASE WHEN ${jumps.jumpNumber} = ${validSearchedJumpNumber} THEN 0 ELSE 1 END`,
                      ),
                  ]
                : []),
            orderFn(primaryOrder),
            orderFn(secondaryOrder),
        )
        .limit(JUMPS_PER_PAGE + 1)
        .offset(offset);
}

export async function getJumpTypesByJump(
    c: AppRequestContext,
    jumpUuids: string[],
) {
    if (jumpUuids.length === 0) {
        return new Map<string, JumpCardItem[]>();
    }

    const db = getAppContext(c).db;
    const rows = await db
        .select({
            jumpUuid: jumpsToJumpTypes.jumpUuid,
            name: jumpTypes.name,
            description: jumpTypes.description,
        })
        .from(jumpsToJumpTypes)
        .innerJoin(jumpTypes, eq(jumpsToJumpTypes.jumpTypeUuid, jumpTypes.uuid))
        .where(inArray(jumpsToJumpTypes.jumpUuid, jumpUuids))
        .orderBy(jumpTypes.name);

    const jumpTypesByJump = new Map<string, JumpCardItem[]>();
    for (const row of rows) {
        const list = jumpTypesByJump.get(row.jumpUuid) ?? [];
        list.push({ name: row.name, description: row.description });
        jumpTypesByJump.set(row.jumpUuid, list);
    }
    return jumpTypesByJump;
}

export async function getAircraftsByJump(
    c: AppRequestContext,
    jumpUuids: string[],
) {
    if (jumpUuids.length === 0) {
        return new Map<string, JumpCardItem[]>();
    }
    const rows = await getAppContext(c)
        .db.select({
            jumpUuid: jumpsToAircrafts.jumpUuid,
            name: aircrafts.name,
            description: aircrafts.description,
        })
        .from(jumpsToAircrafts)
        .innerJoin(aircrafts, eq(jumpsToAircrafts.aircraftUuid, aircrafts.uuid))
        .where(inArray(jumpsToAircrafts.jumpUuid, jumpUuids))
        .orderBy(aircrafts.name);
    const aircraftsByJump = new Map<string, JumpCardItem[]>();
    for (const row of rows) {
        const list = aircraftsByJump.get(row.jumpUuid) ?? [];
        list.push({ name: row.name, description: row.description });
        aircraftsByJump.set(row.jumpUuid, list);
    }
    return aircraftsByJump;
}

export async function getGearByJump(c: AppRequestContext, jumpUuids: string[]) {
    if (jumpUuids.length === 0) {
        return new Map<string, JumpCardItem[]>();
    }
    const rows = await getAppContext(c)
        .db.select({
            jumpUuid: jumpsToGear.jumpUuid,
            name: gear.name,
            description: gear.description,
        })
        .from(jumpsToGear)
        .innerJoin(gear, eq(jumpsToGear.gearUuid, gear.uuid))
        .where(inArray(jumpsToGear.jumpUuid, jumpUuids))
        .orderBy(gear.name);
    const gearByJump = new Map<string, JumpCardItem[]>();
    for (const row of rows) {
        const list = gearByJump.get(row.jumpUuid) ?? [];
        list.push({ name: row.name, description: row.description });
        gearByJump.set(row.jumpUuid, list);
    }
    return gearByJump;
}

export function JumpList(props: {
    jumps: JumpListItem[];
    filters: LogbookFilters;
    offset?: number;
}) {
    const offset = props.offset ?? 0;
    const hasMoreJumps = props.jumps.length > JUMPS_PER_PAGE;
    const visibleJumps = props.jumps.slice(0, JUMPS_PER_PAGE);
    const showGaps =
        props.filters.sortBy === "jumpNumber" &&
        props.filters.locationUuids.length === 0 &&
        props.filters.gearUuids.length === 0 &&
        props.filters.jumpTypeUuids.length === 0 &&
        props.filters.start === "" &&
        props.filters.end === "" &&
        props.filters.search === "";
    const jumpNumberDescending = props.filters.sortOrder === "desc";

    return (
        <>
            {visibleJumps.flatMap((jump, index) => {
                const cards = [<JumpCard {...jump} key={jump.uuid} />];
                const nextJump = props.jumps[index + 1];
                if (!showGaps || !nextJump) {
                    return cards;
                }
                const missingJumpNumbers = [];
                if (jumpNumberDescending) {
                    for (
                        let jumpNumber = jump.jumpNumber - 1;
                        jumpNumber > nextJump.jumpNumber;
                        jumpNumber--
                    ) {
                        missingJumpNumbers.push(jumpNumber);
                    }
                } else {
                    for (
                        let jumpNumber = jump.jumpNumber + 1;
                        jumpNumber < nextJump.jumpNumber;
                        jumpNumber++
                    ) {
                        missingJumpNumbers.push(jumpNumber);
                    }
                }
                if (missingJumpNumbers.length > 0) {
                    const lowerJumpNumber = Math.min(
                        jump.jumpNumber,
                        nextJump.jumpNumber,
                    );
                    const upperJumpNumber = Math.max(
                        jump.jumpNumber,
                        nextJump.jumpNumber,
                    );
                    cards.push(
                        <MissingJumpCard
                            jumpNumbers={missingJumpNumbers}
                            lowerJumpNumber={lowerJumpNumber}
                            upperJumpNumber={upperJumpNumber}
                            returnTo={buildLogbookUrl(props.filters)}
                            key={`missing-after-${nextJump.jumpNumber}`}
                        />,
                    );
                }
                return cards;
            })}
            {hasMoreJumps && (
                <li
                    hx-get={getLogbookJumpsUrl(
                        props.filters,
                        offset + JUMPS_PER_PAGE,
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
    const appContext = getAppContext(c);
    const user = appContext.getUser();
    const options = user.options;
    const resources = await getLogbookFilterResources(c);
    const filters = getLogbookFilters(c, resources);
    const [jumpRows, [jumpNumberRow]] = await Promise.all([
        getLogbookJumps(c, filters),
        appContext.db
            .select({
                maxJumpNumber: sql<number | null>`max(${jumps.jumpNumber})`,
            })
            .from(jumps)
            .where(eq(jumps.userUuid, user.uuid)),
    ]);
    const jumpUuids = jumpRows.map((jump) => jump.uuid);
    const [aircraftsByJump, jumpTypesByJump, gearByJump] = await Promise.all([
        getAircraftsByJump(c, jumpUuids),
        getJumpTypesByJump(c, jumpUuids),
        getGearByJump(c, jumpUuids),
    ]);
    const showCreatedAt = filters.sortBy === "createdAt";
    const jumpCards = jumpRows.map((jump) => ({
        ...jump,
        showCreatedAt,
        aircraftItems: aircraftsByJump.get(jump.uuid) ?? [],
        jumpTypeItems: jumpTypesByJump.get(jump.uuid) ?? [],
        gearItems: gearByJump.get(jump.uuid) ?? [],
        options,
    }));
    const hasActiveFilters =
        filters.locationUuids.length > 0 ||
        filters.gearUuids.length > 0 ||
        filters.jumpTypeUuids.length > 0 ||
        filters.start !== "" ||
        filters.end !== "" ||
        filters.search !== "" ||
        !isDefaultLogbookSort(filters);

    return c.render(
        <LogbookPage title={`${jumpNumberRow?.maxJumpNumber ?? 0} Jumps`}>
            <section className="space-y-3">
                <JumpFilters
                    filters={filters}
                    locations={resources.locations}
                    gear={resources.gear}
                    jumpTypes={resources.jumpTypes}
                />
                {(jumpRows.length > 0 || hasActiveFilters) && (
                    <JumpSearch filters={filters} />
                )}
                {jumpRows.length === 0 ? (
                    hasActiveFilters ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                No jumps match the selected filters or search.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 dark:border-indigo-900 dark:bg-indigo-950/40">
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                                Start your logbook
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                <a
                                    href={routes.logbook.jumps.new({}, {})}
                                    className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                                >
                                    Add your first jump
                                </a>
                                , import an existing logbook using a{` `}
                                <a
                                    href={routes.logbook.transfer.index({})}
                                    className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                                >
                                    CSV file
                                </a>
                                , or use{` `}
                                <a
                                    href={routes.logbook.jumps.fromImage({})}
                                    className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                                >
                                    AI vision
                                </a>
                                {` `}
                                to read your physical logbook.
                            </p>
                        </div>
                    )
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
