import {
    and,
    asc,
    desc,
    eq,
    gt,
    gte,
    inArray,
    lt,
    lte,
    or,
    sql,
} from "drizzle-orm";
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
import { Button, ButtonLink } from "@/components/form";
import { Link } from "@/components/link";
import { Details } from "@/components/ui/details";
import { LogbookPage } from "@/app/logbook-page";
import {
    JumpCard,
    type JumpCardItem,
    type JumpListItem,
} from "@/route-handlers/logbook/components/jump-list";
import { MissingJumpCard } from "@/route-handlers/logbook/jumps/gaps";
import {
    JUMP_SEEK_BEFORE,
    appendLogbookFilterParams,
    buildLogbookUrl,
    isDefaultLogbookSort,
    jumpAnchorId,
    JumpSearch,
    logbookSortParam,
} from "@/route-handlers/logbook/components/search";
import { JumpItemSelect } from "@/components/jump-item-select";
import { DateInput } from "@/components/date-input";
import { Script } from "@/components/script";
import { ScrollToTop } from "@/route-handlers/logbook/components/scroll-to-top";
import { $select } from "@/utils";
import { ExportLogbookButton } from "@/components/export-logbook-button";

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
const CSV_BACKUP_REMINDER_AGE_MS = 30 * 24 * 60 * 60 * 1_000;

function shouldShowCsvBackupReminder(props: {
    jumpCount: number;
    latestJumpCreatedAt: number | null;
    lastCsvExportAt: string;
    readonly: boolean;
    now?: Date;
}): boolean {
    if (props.readonly || props.jumpCount < 2) {
        return false;
    }
    const exportTime = Date.parse(props.lastCsvExportAt);
    if (Number.isNaN(exportTime)) {
        return true;
    }
    const now = props.now ?? new Date();
    const latestJumpTime = (props.latestJumpCreatedAt ?? 0) * 1_000;
    return (
        now.getTime() - exportTime > CSV_BACKUP_REMINDER_AGE_MS &&
        latestJumpTime > exportTime
    );
}

function CsvBackupReminder() {
    return (
        <aside className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm sm:flex sm:items-center sm:gap-6 dark:border-amber-800 dark:bg-amber-950/40">
            <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-amber-950 dark:text-amber-100">
                    Back up your logbook
                </h2>
                <p className="mt-1 text-sm leading-6 text-amber-900 dark:text-amber-200">
                    Download a CSV backup so your latest jumps are stored
                    outside Loki.
                </p>
            </div>
            <ExportLogbookButton className="mt-3 w-full shrink-0 sm:mt-0 sm:w-auto" />
        </aside>
    );
}

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
                <Link
                    href={routes.logbook.index({})}
                    className="ml-auto text-sm"
                >
                    Clear filters
                </Link>
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
            className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            summary={<JumpFiltersSummary hasFilters={hasFilters} />}
            summaryClassName="h-10 px-4 text-sm font-medium text-slate-900 dark:text-slate-100"
        >
            <form
                action={routes.logbook.index({})}
                method="get"
                className="mx-4 mb-4 mt-2 space-y-4 border-t border-slate-200 pt-3 dark:border-slate-800"
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
                            <Link href={routes.logbook.locations.index({})}>
                                Manage locations
                            </Link>{" "}
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
                            <Link href={routes.logbook.gear.index({})}>
                                Manage gear
                            </Link>{" "}
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
                            <Link href={routes.logbook.jumpTypes.index({})}>
                                Manage jump types
                            </Link>{" "}
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

function parsePositiveInt(value: string | null): number | null {
    if (value === null || !/^\d+$/.test(value)) {
        return null;
    }
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
}

function parseOffset(value: string | null): number {
    if (value === null || !/^\d+$/.test(value)) {
        return 0;
    }
    const offset = Number(value);
    return Number.isSafeInteger(offset) && offset > 0 ? offset : 0;
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

const logbookJumpSelect = {
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
};

function jumpsBeforeSeekCondition(
    filters: LogbookFilters,
    jumpNumber: number,
    anchor: { jumpNumber: number; createdAt: number } | undefined,
) {
    const descending = filters.sortOrder === "desc";
    if (!anchor) {
        if (filters.sortBy !== "jumpNumber") {
            return null;
        }
        if (descending) {
            return gt(jumps.jumpNumber, jumpNumber);
        }
        return lt(jumps.jumpNumber, jumpNumber);
    }
    if (filters.sortBy === "createdAt") {
        if (descending) {
            return or(
                gt(jumps.createdAt, anchor.createdAt),
                and(
                    eq(jumps.createdAt, anchor.createdAt),
                    gt(jumps.jumpNumber, anchor.jumpNumber),
                ),
            );
        }
        return or(
            lt(jumps.createdAt, anchor.createdAt),
            and(
                eq(jumps.createdAt, anchor.createdAt),
                lt(jumps.jumpNumber, anchor.jumpNumber),
            ),
        );
    }
    if (descending) {
        return or(
            gt(jumps.jumpNumber, anchor.jumpNumber),
            and(
                eq(jumps.jumpNumber, anchor.jumpNumber),
                gt(jumps.createdAt, anchor.createdAt),
            ),
        );
    }
    return or(
        lt(jumps.jumpNumber, anchor.jumpNumber),
        and(
            eq(jumps.jumpNumber, anchor.jumpNumber),
            lt(jumps.createdAt, anchor.createdAt),
        ),
    );
}

async function countJumpsBeforeSeek(
    c: AppRequestContext,
    filters: LogbookFilters,
    jumpNumber: number,
): Promise<number> {
    const db = getAppContext(c).db;
    const conditions = getLogbookJumpConditions(c, filters);
    const orderFn = filters.sortOrder === "asc" ? asc : desc;
    const primaryOrder =
        filters.sortBy === "createdAt" ? jumps.createdAt : jumps.jumpNumber;
    const secondaryOrder =
        filters.sortBy === "createdAt" ? jumps.jumpNumber : jumps.createdAt;
    const [anchor] = await db
        .select({
            jumpNumber: jumps.jumpNumber,
            createdAt: jumps.createdAt,
        })
        .from(jumps)
        .where(and(...conditions, eq(jumps.jumpNumber, jumpNumber)))
        .orderBy(orderFn(primaryOrder), orderFn(secondaryOrder))
        .limit(1);
    const beforeCondition = jumpsBeforeSeekCondition(
        filters,
        jumpNumber,
        anchor,
    );
    if (!beforeCondition) {
        return 0;
    }
    const [row] = await db
        .select({ count: sql<number>`count(*)` })
        .from(jumps)
        .where(and(...conditions, beforeCondition));
    return Number(row?.count ?? 0);
}

export async function getLogbookJumps(
    c: AppRequestContext,
    filters: LogbookFilters,
    offset = 0,
) {
    const db = getAppContext(c).db;
    const orderFn = filters.sortOrder === "asc" ? asc : desc;
    const primaryOrder =
        filters.sortBy === "createdAt" ? jumps.createdAt : jumps.jumpNumber;
    const secondaryOrder =
        filters.sortBy === "createdAt" ? jumps.jumpNumber : jumps.createdAt;
    const conditions = getLogbookJumpConditions(c, filters);
    return db
        .select(logbookJumpSelect)
        .from(jumps)
        .leftJoin(locations, eq(jumps.locationUuid, locations.uuid))
        .where(and(...conditions))
        .orderBy(orderFn(primaryOrder), orderFn(secondaryOrder))
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
                const nextJump = visibleJumps[index + 1];
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

function ScrollToJumpHash() {
    return (
        <Script
            $deps={[$select]}
            $exec={() => {
                const hash = window.location.hash;
                if (!hash.startsWith("#jump-")) {
                    return;
                }
                const target = $select.idOrNull(hash.slice(1), HTMLElement);
                if (!target) {
                    return;
                }
                target.scrollIntoView();
            }}
        />
    );
}

function previousLogbookOffset(offset: number): number {
    return Math.max(0, offset - JUMPS_PER_PAGE + 1);
}

function LogbookOffsetControls(props: {
    filters: LogbookFilters;
    offset: number;
    topJumpNumber?: number;
}) {
    const previousOffset = previousLogbookOffset(props.offset);
    const previousHref =
        props.topJumpNumber === undefined
            ? buildLogbookUrl(props.filters, { offset: previousOffset })
            : `${buildLogbookUrl(props.filters, { offset: previousOffset })}#${jumpAnchorId(props.topJumpNumber)}`;
    return (
        <li className="col-span-full flex flex-wrap items-center justify-center gap-3 py-1">
            <ButtonLink
                href={previousHref}
                variant="secondary"
                data-loki-tooltip="Load more jumps from earlier in the logbook"
            >
                Load earlier jumps
            </ButtonLink>
            <ButtonLink
                href={buildLogbookUrl(props.filters)}
                variant="secondary"
                data-loki-tooltip="Return to the start of the logbook"
            >
                Clear offset
            </ButtonLink>
        </li>
    );
}

async function renderLogbook(c: AppRequestContext) {
    const appContext = getAppContext(c);
    const user = appContext.getUser();
    const options = user.options;
    const resources = await getLogbookFilterResources(c);
    const filters = getLogbookFilters(c, resources);
    const query = new URL(c.req.url).searchParams;
    const gotoJump = parsePositiveInt(query.get("goto"));
    if (gotoJump !== null) {
        const beforeCount = await countJumpsBeforeSeek(c, filters, gotoJump);
        const offset = Math.max(0, beforeCount - JUMP_SEEK_BEFORE);
        return c.redirect(
            `${buildLogbookUrl(filters, { offset })}#${jumpAnchorId(gotoJump)}`,
        );
    }
    const offset = parseOffset(query.get("offset"));
    const [jumpRows, [jumpSummary]] = await Promise.all([
        getLogbookJumps(c, filters, offset),
        appContext.db
            .select({
                maxJumpNumber: sql<number | null>`max(${jumps.jumpNumber})`,
                jumpCount: sql<number>`count(*)`,
                latestJumpCreatedAt: sql<
                    number | null
                >`max(${jumps.createdAt})`,
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
    const showCsvBackupReminder = shouldShowCsvBackupReminder({
        jumpCount: jumpSummary?.jumpCount ?? 0,
        latestJumpCreatedAt: jumpSummary?.latestJumpCreatedAt ?? null,
        lastCsvExportAt: options.lastCsvExportAt,
        readonly: user.readonly,
    });

    return c.render(
        <LogbookPage title={`${jumpSummary?.maxJumpNumber ?? 0} Jumps`}>
            <section className="space-y-3">
                {showCsvBackupReminder && <CsvBackupReminder />}
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
                                <Link href={routes.logbook.jumps.new({}, {})}>
                                    Add your first jump
                                </Link>
                                , import an existing logbook using a{` `}
                                <Link href={routes.logbook.transfer.index({})}>
                                    CSV file
                                </Link>
                                , or use{` `}
                                <Link href={routes.logbook.jumps.fromImage({})}>
                                    AI vision
                                </Link>
                                {` `}
                                to read your physical logbook.
                            </p>
                            <form
                                action={routes.logbook.injectExampleData({})}
                                method="post"
                                className="mt-4"
                            >
                                <Button
                                    type="submit"
                                    variant="secondary"
                                    size="sm"
                                >
                                    Load example data
                                </Button>
                            </form>
                            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                                Tip: example data can be cleared later via{` `}
                                <Link
                                    href={`${routes.preferences({})}#danger-zone`}
                                >
                                    Delete logbook data
                                </Link>
                                .
                            </p>
                        </div>
                    )
                ) : (
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {offset > 0 && (
                            <LogbookOffsetControls
                                filters={filters}
                                offset={offset}
                                topJumpNumber={jumpCards[0]?.jumpNumber}
                            />
                        )}
                        <JumpList
                            jumps={jumpCards}
                            filters={filters}
                            offset={offset}
                        />
                    </ul>
                )}
                <ScrollToJumpHash />
                <ScrollToTop />
            </section>
        </LogbookPage>,
    );
}

export function register(app: App) {
    app.get(routes.logbook.index.route, renderLogbook);
}
