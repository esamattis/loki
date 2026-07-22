import clsx from "clsx";
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
    gear,
    locations,
} from "@/schema";
import { formatDuration } from "@/utils/format-duration";
import { Script } from "@/components/script";
import { $select } from "@/utils";
import { useId } from "hono/jsx";
import { jumpAnchorId } from "@/route-handlers/logbook/components/search";

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
    createdAt: number;
    showCreatedAt?: boolean;
    locationName: string;
    locationDescription: string | null;
    aircraftItems: JumpCardItem[];
    exitAltitude: number;
    openingAltitude: number;
    freefallTime: number;
    description: string | null;
    jumpTypeItems: JumpCardItem[];
    gearItems: JumpCardItem[];
}

export interface JumpCardItem {
    name: string;
    description: string | null;
}

const shortWeekdayFormatter = new Intl.DateTimeFormat("en", {
    weekday: "short",
    timeZone: "UTC",
});

function formatShortWeekday(value: string): string {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime())
        ? ""
        : shortWeekdayFormatter.format(date);
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

function JumpItemNames(props: { items: JumpCardItem[]; fallback?: string }) {
    if (props.items.length === 0) {
        return <>{props.fallback}</>;
    }
    return (
        <>
            {props.items.map((item, index) => (
                <span
                    key={item.name}
                    data-loki-tooltip={item.description || undefined}
                >
                    {index > 0 && ", "}
                    {item.name}
                </span>
            ))}
        </>
    );
}

function ClampedDescription(props: { description: string; jumpUuid: string }) {
    const idPrefix = `${useId()}-${props.jumpUuid}`;
    const descriptionId = `${idPrefix}-description`;
    const buttonId = `${idPrefix}-show-all`;
    return (
        <div className="mx-5 mb-3">
            <p
                id={descriptionId}
                className="line-clamp-2 text-sm italic text-indigo-800/70 dark:text-indigo-200/70"
            >
                {props.description}
            </p>
            <button
                id={buttonId}
                type="button"
                hidden
                aria-controls={descriptionId}
                aria-expanded="false"
                className="relative z-10 mt-0.5 text-xs font-medium text-indigo-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:text-indigo-400"
            >
                Show all
            </button>
            <Script
                $deps={[$select]}
                $args={[descriptionId, buttonId]}
                $exec={(descriptionId, buttonId) => {
                    const description = $select.id(
                        descriptionId,
                        HTMLParagraphElement,
                    );
                    const button = $select.id(buttonId, HTMLButtonElement);
                    function updateButton() {
                        button.hidden =
                            description.scrollHeight <=
                            description.clientHeight + 1;
                    }
                    const resizeObserver = new ResizeObserver(updateButton);
                    resizeObserver.observe(description);
                    updateButton();
                    button.addEventListener("click", () => {
                        description.classList.remove("line-clamp-2");
                        button.setAttribute("aria-expanded", "true");
                        button.hidden = true;
                        resizeObserver.disconnect();
                    });
                }}
            />
        </div>
    );
}

export function JumpCard(props: JumpListItem) {
    const formatDate = useDateFormatter();
    const weekday = formatShortWeekday(props.jumpDate);
    return (
        <li
            id={jumpAnchorId(props.jumpNumber)}
            className={clsx(
                "relative scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-indigo-300 hover:bg-slate-50/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700 dark:hover:bg-slate-800/40 dark:hover:shadow-black/30",
                "target:border-indigo-400 target:ring-2 target:ring-indigo-300/70 dark:target:border-indigo-500 dark:target:ring-indigo-500/40",
            )}
        >
            <a
                href={routes.logbook.jumps.edit({ uuid: props.uuid })}
                className="block px-5 py-4 after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-indigo-500/50 dark:focus-visible:after:ring-indigo-400/50"
            >
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                    <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <span className="flex min-w-9 items-center justify-center rounded-xl bg-indigo-100 px-2 py-1.5 text-sm font-bold text-indigo-700 tabular-nums dark:bg-indigo-900/40 dark:text-indigo-300">
                                #{props.jumpNumber}
                            </span>
                            <time
                                dateTime={props.jumpDate}
                                className="text-sm text-slate-500 tabular-nums dark:text-slate-400"
                            >
                                {weekday && `${weekday}, `}
                                {formatDate(props.jumpDate)}
                            </time>
                        </div>
                        {props.showCreatedAt && (
                            <time
                                dateTime={new Date(
                                    props.createdAt * 1000,
                                ).toISOString()}
                                className="text-xs text-slate-400 tabular-nums dark:text-slate-500"
                            >
                                Added {formatDate(props.createdAt)}
                            </time>
                        )}
                    </div>
                    {props.jumpTypeItems.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {props.jumpTypeItems.map((item) => (
                                <span
                                    key={item.name}
                                    data-loki-tooltip={
                                        item.description || undefined
                                    }
                                    className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200/60 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-700/50"
                                >
                                    {item.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <div className="mt-3 min-w-0">
                    <p
                        data-loki-tooltip={
                            props.locationDescription || undefined
                        }
                        className="break-words text-base font-semibold text-slate-900 dark:text-slate-100"
                    >
                        {props.locationName}
                    </p>
                    <p className="mt-0.5 break-words text-sm text-slate-500 dark:text-slate-400">
                        <JumpItemNames
                            items={props.aircraftItems}
                            fallback="Not set"
                        />
                    </p>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <JumpStat label="Exit">
                        <Altitude meters={props.exitAltitude} />
                    </JumpStat>
                    <JumpStat label="Opening">
                        <Altitude meters={props.openingAltitude} />
                    </JumpStat>
                    <JumpStat label="Freefall">
                        <span data-loki-tooltip={`${props.freefallTime}s`}>
                            {formatDuration(props.freefallTime)}
                        </span>
                    </JumpStat>
                    <JumpStat label="Avg speed">
                        <JumpAvgSpeed
                            exitAltitude={props.exitAltitude}
                            openingAltitude={props.openingAltitude}
                            freefallTime={props.freefallTime}
                        />
                    </JumpStat>
                </dl>
            </a>
            {props.description && (
                <ClampedDescription
                    description={props.description}
                    jumpUuid={props.uuid}
                />
            )}
            {props.gearItems.length > 0 && (
                <p className="mx-5 mb-4 border-t border-slate-200 pt-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                        Gear:
                    </span>{" "}
                    <JumpItemNames items={props.gearItems} />
                </p>
            )}
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
    recordedUsageCount: number;
}) {
    return (
        <section className="space-y-3">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {props.title}
                </h2>
                <p className="text-sm text-slate-400 dark:text-slate-500">
                    {props.recordedUsageCount} jumps in total
                </p>
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
        .where(and(eq(jumps.userUuid, config.userUuid), itemCondition))
        .orderBy(desc(jumps.jumpNumber))
        .limit(RECENT_JUMPS_LIMIT);

    if (jumpRows.length === 0) {
        return [];
    }

    const jumpUuids = jumpRows.map((jump) => jump.uuid);
    const [aircraftRows, jumpTypeRows, gearRows] = await Promise.all([
        db
            .select({
                jumpUuid: jumpsToAircrafts.jumpUuid,
                name: aircrafts.name,
                description: aircrafts.description,
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
                description: jumpTypes.description,
            })
            .from(jumpsToJumpTypes)
            .innerJoin(
                jumpTypes,
                eq(jumpsToJumpTypes.jumpTypeUuid, jumpTypes.uuid),
            )
            .where(inArray(jumpsToJumpTypes.jumpUuid, jumpUuids))
            .orderBy(jumpTypes.name),
        db
            .select({
                jumpUuid: jumpsToGear.jumpUuid,
                name: gear.name,
                description: gear.description,
            })
            .from(jumpsToGear)
            .innerJoin(gear, eq(jumpsToGear.gearUuid, gear.uuid))
            .where(inArray(jumpsToGear.jumpUuid, jumpUuids))
            .orderBy(gear.name),
    ]);

    const aircraftsByJump = new Map<string, JumpCardItem[]>();
    for (const row of aircraftRows) {
        const list = aircraftsByJump.get(row.jumpUuid) ?? [];
        list.push({ name: row.name, description: row.description });
        aircraftsByJump.set(row.jumpUuid, list);
    }
    const jumpTypesByJump = new Map<string, JumpCardItem[]>();
    for (const row of jumpTypeRows) {
        const list = jumpTypesByJump.get(row.jumpUuid) ?? [];
        list.push({ name: row.name, description: row.description });
        jumpTypesByJump.set(row.jumpUuid, list);
    }
    const gearByJump = new Map<string, JumpCardItem[]>();
    for (const row of gearRows) {
        const list = gearByJump.get(row.jumpUuid) ?? [];
        list.push({ name: row.name, description: row.description });
        gearByJump.set(row.jumpUuid, list);
    }

    return jumpRows.map((jump) => ({
        ...jump,
        aircraftItems: aircraftsByJump.get(jump.uuid) ?? [],
        jumpTypeItems: jumpTypesByJump.get(jump.uuid) ?? [],
        gearItems: gearByJump.get(jump.uuid) ?? [],
    }));
}
