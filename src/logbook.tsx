import { desc, eq } from "drizzle-orm";
import { app, getAppContext, type AppRequestContext } from "./app";
import * as routes from "./routes";
import { aircrafts, jumps, locations } from "./schema";
import { Script } from "./components/helpers";
import { LogbookPage } from "./logbook/layout";
import "./logbook/aircraft";
import "./logbook/gear";
import "./logbook/jump";
import "./logbook/jump-type";
import "./logbook/location";
import "./logbook/transfer";
import { useId } from "hono/jsx";
import { $assertElement } from "./utils";

function LogbookManagementMenu() {
    const id = useId();
    const menuId = `logbook-management-menu-${id}`;
    const buttonId = `logbook-management-button-${id}`;

    return (
        <div className="relative">
            <button
                id={buttonId}
                type="button"
                aria-controls={menuId}
                aria-expanded="false"
                className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
                Manage logbook
            </button>
            <div
                id={menuId}
                hidden
                className="absolute left-0 z-10 mt-2 w-52 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
            >
                <a
                    href={routes.aircraftList({})}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    Manage aircraft
                </a>
                <a
                    href={routes.gearList({})}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    Manage gear
                </a>
                <a
                    href={routes.jumpTypeList({})}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    Manage jump types
                </a>
                <a
                    href={routes.locationList({})}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    Manage locations
                </a>
                <a
                    href={routes.logbookTransfer({})}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    Import or export
                </a>
            </div>
            <Script
                $deps={[$assertElement]}
                $args={[buttonId, menuId]}
                $exec={(buttonId, menuId) => {
                    const button = document.getElementById(buttonId);
                    $assertElement(button, HTMLButtonElement);
                    const menu = document.getElementById(menuId);
                    $assertElement(menu, HTMLDivElement);
                    if (
                        !(button instanceof HTMLButtonElement) ||
                        !(menu instanceof HTMLDivElement)
                    ) {
                        return;
                    }
                    function setMenuOpen(
                        menuElement: HTMLDivElement,
                        buttonElement: HTMLButtonElement,
                        isOpen: boolean,
                    ) {
                        menuElement.hidden = !isOpen;
                        buttonElement.setAttribute(
                            "aria-expanded",
                            String(isOpen),
                        );
                    }

                    button.addEventListener("click", () => {
                        setMenuOpen(menu, button, Boolean(menu.hidden));
                    });

                    document.addEventListener("click", (event) => {
                        if (
                            !menu.hidden &&
                            event.target instanceof Node &&
                            !menu.contains(event.target) &&
                            !button.contains(event.target)
                        ) {
                            setMenuOpen(menu, button, false);
                        }
                    });

                    document.addEventListener("keydown", (event) => {
                        if (event.key === "Escape" && !menu.hidden) {
                            setMenuOpen(menu, button, false);
                            button.focus();
                        }
                    });
                }}
            />
        </div>
    );
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

async function renderLogbook(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const jumpRows = await db
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
        .where(eq(jumps.userUuid, userUuid))
        .orderBy(desc(jumps.jumpNumber));

    let totalFreefallDistance = 0;
    let totalFreefallTime = 0;
    for (const jump of jumpRows) {
        if (jump.freefallTime > 0) {
            totalFreefallDistance += jumpFreefallDistance(jump);
            totalFreefallTime += jump.freefallTime;
        }
    }
    const overallAvgSpeed =
        totalFreefallTime > 0
            ? totalFreefallDistance / totalFreefallTime
            : null;

    return c.render(
        <LogbookPage title="Jump Logbook">
            <nav className="flex flex-wrap gap-3">
                <a
                    href={routes.jumpNew({}, {})}
                    className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                    Add jump
                </a>
                <LogbookManagementMenu />
            </nav>
            {jumpRows.length > 0 && (
                <LogbookStats
                    totalJumps={jumpRows.length}
                    avgSpeed={overallAvgSpeed}
                />
            )}
            <section className="overflow-hidden rounded-lg bg-white shadow-sm">
                <h2 className="border-b border-gray-200 px-5 py-4 text-lg font-semibold">
                    Jumps
                </h2>
                {jumpRows.length === 0 ? (
                    <p className="p-5 text-gray-600">No jumps yet.</p>
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
                            />
                        ))}
                    </ul>
                )}
            </section>
        </LogbookPage>,
    );
}

app.get(routes.logbook.route, renderLogbook);
