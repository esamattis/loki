import { desc, eq } from "drizzle-orm";
import { app, getAppContext, type AppRequestContext } from "./app";
import * as routes from "./routes";
import { aircrafts, jumps, locations } from "./schema";
import { LogbookPage } from "./logbook/layout";
import "./logbook/aircraft";
import "./logbook/gear";
import "./logbook/jump";
import "./logbook/jump-type";
import "./logbook/location";
import "./logbook/transfer";

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

    return c.render(
        <LogbookPage title="Jump Logbook">
            <nav className="flex flex-wrap gap-3">
                <a
                    href={routes.jumpNew({}, {})}
                    className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                    Add jump
                </a>
                <a
                    href={routes.aircraftList({})}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                    Manage aircraft
                </a>
                <a
                    href={routes.gearList({})}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                    Manage gear
                </a>
                <a
                    href={routes.jumpTypeList({})}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                    Manage jump types
                </a>
                <a
                    href={routes.locationList({})}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                    Manage locations
                </a>
                <a
                    href={routes.logbookTransfer({})}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                    Import or export
                </a>
            </nav>
            <section className="overflow-hidden rounded-lg bg-white shadow-sm">
                <h2 className="border-b border-gray-200 px-5 py-4 text-lg font-semibold">
                    Jumps
                </h2>
                {jumpRows.length === 0 ? (
                    <p className="p-5 text-gray-600">No jumps yet.</p>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {jumpRows.map((jump) => (
                            <li>
                                <a
                                    href={routes.jumpEdit({ uuid: jump.uuid })}
                                    className="block px-5 py-4 hover:bg-gray-50"
                                >
                                    <span className="font-semibold text-blue-700">
                                        Jump #{jump.jumpNumber}
                                    </span>
                                    <span className="ml-3 text-sm text-gray-600">
                                        {jump.locationName} /{" "}
                                        {jump.aircraftName}
                                    </span>
                                    <span className="mt-1 block text-sm text-gray-600">
                                        Exit {jump.exitAltitude} m / Opening{" "}
                                        {jump.openingAltitude} m / Freefall{" "}
                                        {jump.freefallTime} s
                                    </span>
                                    {jump.description && (
                                        <span className="mt-1 block text-sm text-gray-600">
                                            {jump.description}
                                        </span>
                                    )}
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </LogbookPage>,
    );
}

app.get(routes.logbook.route, renderLogbook);
