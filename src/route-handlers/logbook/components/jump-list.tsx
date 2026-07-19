import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
    getAppContext,
    useAppContext,
    useAltitudeFormatter,
    useDateFormatter,
    useNumberFormatter,
    useSpeedFormatter,
    type AppRequestContext,
} from "@/app/app";
import * as routes from "@/routes";
import {
    aircrafts,
    jumps,
    jumpsToAircrafts,
    jumpsToGear,
    jumpsToJumpTypes,
    jumpTypes,
    locations,
} from "@/schema";
import { formatDuration } from "@/utils/format-duration";

export function Distance(props: { meters: number }) {
    const altitudeUnits = useAppContext().getUser().options.altitudeUnits;
    const formatNumber = useNumberFormatter();
    if (altitudeUnits === "feet") {
        return <>{formatNumber(Math.round(props.meters / 0.3048))} ft</>;
    }
    return (
        <>
            {formatNumber(props.meters / 1000, {
                maximumFractionDigits: 1,
            })}{" "}
            km
        </>
    );
}

export function Altitude(props: { meters: number }) {
    const formatAltitude = useAltitudeFormatter();
    return <>{formatAltitude(props.meters)}</>;
}

export function Speed(props: { metersPerSecond: number }) {
    const formatSpeed = useSpeedFormatter();
    return <>{formatSpeed(props.metersPerSecond)}</>;
}

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

export function JumpAvgSpeed(props: {
    exitAltitude: number;
    openingAltitude: number;
    freefallTime: number;
}) {
    const avgSpeed = jumpAvgSpeed(props);
    if (avgSpeed === null) {
        return <>—</>;
    }
    return <Speed metersPerSecond={avgSpeed} />;
}

export interface JumpListItem {
    uuid: string;
    jumpNumber: number;
    jumpDate: string;
    locationName: string;
    aircraftNames: string[];
    exitAltitude: number;
    openingAltitude: number;
    freefallTime: number;
    description: string | null;
    jumpTypes: string[];
}

function JumpStat(props: { label: string; children: any }) {
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {props.label}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                {props.children}
            </dd>
        </div>
    );
}

export function JumpCard(props: JumpListItem) {
    const formatDate = useDateFormatter();
    return (
        <li>
            <a
                href={routes.logbook.jumps.edit({ uuid: props.uuid })}
                className="block h-full rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-indigo-300 hover:bg-slate-50/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700 dark:hover:bg-slate-800/40 dark:hover:shadow-black/30 dark:focus-visible:ring-indigo-400/50"
            >
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <div className="flex items-center gap-3">
                        <span className="flex min-w-9 items-center justify-center rounded-xl bg-indigo-100 px-2 py-1.5 text-sm font-bold text-indigo-700 tabular-nums dark:bg-indigo-900/40 dark:text-indigo-300">
                            #{props.jumpNumber}
                        </span>
                        <time
                            dateTime={props.jumpDate}
                            className="text-sm text-slate-500 tabular-nums dark:text-slate-400"
                        >
                            {formatDate(props.jumpDate)}
                        </time>
                        <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            {props.locationName} /{" "}
                            {props.aircraftNames.join(", ") || "Not set"}
                        </span>
                    </div>
                    {props.jumpTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {props.jumpTypes.map((name) => (
                                <span
                                    key={name}
                                    className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200/60 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-700/50"
                                >
                                    {name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <JumpStat label="Exit">
                        <Altitude meters={props.exitAltitude} />
                    </JumpStat>
                    <JumpStat label="Opening">
                        <Altitude meters={props.openingAltitude} />
                    </JumpStat>
                    <JumpStat label="Freefall">
                        {formatDuration(props.freefallTime)}
                    </JumpStat>
                    <JumpStat label="Avg speed">
                        <JumpAvgSpeed
                            exitAltitude={props.exitAltitude}
                            openingAltitude={props.openingAltitude}
                            freefallTime={props.freefallTime}
                        />
                    </JumpStat>
                </dl>
                {props.description && (
                    <p className="mt-3 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                        {props.description}
                    </p>
                )}
            </a>
        </li>
    );
}

export function RecentJumpList(props: {
    jumps: JumpListItem[];
    emptyMessage?: string;
}) {
    if (props.jumps.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {props.emptyMessage ?? "No jumps yet."}
                </p>
            </div>
        );
    }
    return (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {props.jumps.map((jump) => (
                <JumpCard {...jump} key={jump.uuid} />
            ))}
        </ul>
    );
}

export function RecentJumpsSection(props: {
    title: string;
    jumps: JumpListItem[];
    emptyMessage: string;
}) {
    return (
        <section className="space-y-3">
            <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {props.title}
                </h2>
                <span className="text-sm text-slate-400 dark:text-slate-500">
                    Last {props.jumps.length} jump
                    {props.jumps.length === 1 ? "" : "s"}
                </span>
            </div>
            <RecentJumpList
                jumps={props.jumps}
                emptyMessage={props.emptyMessage}
            />
        </section>
    );
}

export type JumpItemRelation = "aircraft" | "location" | "gear" | "jumpType";

const RECENT_JUMPS_LIMIT = 50;

export async function getRecentJumpsForItem(config: {
    c: AppRequestContext;
    userUuid: string;
    itemUuid: string;
    relation: JumpItemRelation;
}): Promise<JumpListItem[]> {
    const db = getAppContext(config.c).db;
    const itemCondition =
        config.relation === "aircraft"
            ? inArray(
                  jumps.uuid,
                  db
                      .select({ jumpUuid: jumpsToAircrafts.jumpUuid })
                      .from(jumpsToAircrafts)
                      .where(
                          eq(jumpsToAircrafts.aircraftUuid, config.itemUuid),
                      ),
              )
            : config.relation === "location"
              ? eq(jumps.locationUuid, config.itemUuid)
              : config.relation === "gear"
                ? inArray(
                      jumps.uuid,
                      db
                          .select({ jumpUuid: jumpsToGear.jumpUuid })
                          .from(jumpsToGear)
                          .where(eq(jumpsToGear.gearUuid, config.itemUuid)),
                  )
                : inArray(
                      jumps.uuid,
                      db
                          .select({ jumpUuid: jumpsToJumpTypes.jumpUuid })
                          .from(jumpsToJumpTypes)
                          .where(
                              eq(
                                  jumpsToJumpTypes.jumpTypeUuid,
                                  config.itemUuid,
                              ),
                          ),
                  );

    const jumpRows = await db
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
        .where(and(eq(jumps.userUuid, config.userUuid), itemCondition))
        .orderBy(desc(jumps.jumpNumber))
        .limit(RECENT_JUMPS_LIMIT);

    if (jumpRows.length === 0) {
        return [];
    }

    const jumpUuids = jumpRows.map((jump) => jump.uuid);
    const [aircraftRows, jumpTypeRows] = await Promise.all([
        db
            .select({
                jumpUuid: jumpsToAircrafts.jumpUuid,
                name: aircrafts.name,
            })
            .from(jumpsToAircrafts)
            .innerJoin(
                aircrafts,
                eq(jumpsToAircrafts.aircraftUuid, aircrafts.uuid),
            )
            .where(inArray(jumpsToAircrafts.jumpUuid, jumpUuids))
            .orderBy(aircrafts.name),
        db
            .select({
                jumpUuid: jumpsToJumpTypes.jumpUuid,
                name: jumpTypes.name,
            })
            .from(jumpsToJumpTypes)
            .innerJoin(
                jumpTypes,
                eq(jumpsToJumpTypes.jumpTypeUuid, jumpTypes.uuid),
            )
            .where(inArray(jumpsToJumpTypes.jumpUuid, jumpUuids))
            .orderBy(jumpTypes.name),
    ]);

    const aircraftsByJump = new Map<string, string[]>();
    for (const row of aircraftRows) {
        const list = aircraftsByJump.get(row.jumpUuid) ?? [];
        list.push(row.name);
        aircraftsByJump.set(row.jumpUuid, list);
    }
    const jumpTypesByJump = new Map<string, string[]>();
    for (const row of jumpTypeRows) {
        const list = jumpTypesByJump.get(row.jumpUuid) ?? [];
        list.push(row.name);
        jumpTypesByJump.set(row.jumpUuid, list);
    }

    return jumpRows.map((jump) => ({
        ...jump,
        aircraftNames: aircraftsByJump.get(jump.uuid) ?? [],
        jumpTypes: jumpTypesByJump.get(jump.uuid) ?? [],
    }));
}
