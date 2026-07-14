import { and, desc, eq, inArray } from "drizzle-orm";
import {
    getAppContext,
    useAppContext,
    type AppRequestContext,
} from "@/app/app";
import { formatAltitude, formatSpeed, type UserOptions } from "@/options";
import * as routes from "@/routes";
import {
    aircrafts,
    jumps,
    jumpsToGear,
    jumpsToJumpTypes,
    jumpTypes,
    locations,
} from "@/schema";

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

export function Distance(props: { meters: number }) {
    const units = useAppContext().getUser().options.altitudeUnits;
    return <>{formatDistance(props.meters, units)}</>;
}

export function Altitude(props: { meters: number }) {
    const units = useAppContext().getUser().options.altitudeUnits;
    return <>{formatAltitude(props.meters, units)}</>;
}

export function formatDuration(totalSeconds: number): string {
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];
    if (days > 0) {
        parts.push(`${days} d`);
    }
    if (hours > 0 || days > 0) {
        parts.push(`${hours} h`);
    }
    if (minutes > 0 || hours > 0 || days > 0) {
        parts.push(`${minutes} min`);
    }
    parts.push(`${seconds} s`);
    return parts.join(" ");
}

export function Speed(props: { metersPerSecond: number }) {
    const units = useAppContext().getUser().options.speedUnits;
    return <>{formatSpeed(props.metersPerSecond, units)}</>;
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
    aircraftName: string;
    exitAltitude: number;
    openingAltitude: number;
    freefallTime: number;
    description: string | null;
    jumpTypes: string[];
    options: UserOptions;
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
    return (
        <li>
            <a
                href={routes.logbook.jumps.edit({ uuid: props.uuid })}
                className="block rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-indigo-300 hover:bg-slate-50/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700 dark:hover:bg-slate-800/40 dark:hover:shadow-black/30 dark:focus-visible:ring-indigo-400/50"
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
                            {props.jumpDate}
                        </time>
                        <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            {props.locationName} / {props.aircraftName}
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

export async function getRecentJumpsForItem(
    c: AppRequestContext,
    userUuid: string,
    options: UserOptions,
    itemUuid: string,
    relation: JumpItemRelation,
): Promise<JumpListItem[]> {
    const db = getAppContext(c).db;
    const itemCondition =
        relation === "aircraft"
            ? eq(jumps.aircraftUuid, itemUuid)
            : relation === "location"
              ? eq(jumps.locationUuid, itemUuid)
              : relation === "gear"
                ? inArray(
                      jumps.uuid,
                      db
                          .select({ jumpUuid: jumpsToGear.jumpUuid })
                          .from(jumpsToGear)
                          .where(eq(jumpsToGear.gearUuid, itemUuid)),
                  )
                : inArray(
                      jumps.uuid,
                      db
                          .select({ jumpUuid: jumpsToJumpTypes.jumpUuid })
                          .from(jumpsToJumpTypes)
                          .where(eq(jumpsToJumpTypes.jumpTypeUuid, itemUuid)),
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
            locationName: locations.name,
            aircraftName: aircrafts.name,
        })
        .from(jumps)
        .innerJoin(locations, eq(jumps.locationUuid, locations.uuid))
        .innerJoin(aircrafts, eq(jumps.aircraftUuid, aircrafts.uuid))
        .where(and(eq(jumps.userUuid, userUuid), itemCondition))
        .orderBy(desc(jumps.jumpNumber))
        .limit(RECENT_JUMPS_LIMIT);

    if (jumpRows.length === 0) {
        return [];
    }

    const jumpUuids = jumpRows.map((jump) => jump.uuid);
    const jumpTypeRows = await db
        .select({
            jumpUuid: jumpsToJumpTypes.jumpUuid,
            name: jumpTypes.name,
        })
        .from(jumpsToJumpTypes)
        .innerJoin(jumpTypes, eq(jumpsToJumpTypes.jumpTypeUuid, jumpTypes.uuid))
        .where(inArray(jumpsToJumpTypes.jumpUuid, jumpUuids))
        .orderBy(jumpTypes.name);

    const jumpTypesByJump = new Map<string, string[]>();
    for (const row of jumpTypeRows) {
        const list = jumpTypesByJump.get(row.jumpUuid) ?? [];
        list.push(row.name);
        jumpTypesByJump.set(row.jumpUuid, list);
    }

    return jumpRows.map((jump) => ({
        ...jump,
        jumpTypes: jumpTypesByJump.get(jump.uuid) ?? [],
        options,
    }));
}
