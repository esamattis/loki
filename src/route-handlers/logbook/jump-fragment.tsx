import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import {
    getAircraftsByJump,
    getGearByJump,
    getJumpTypesByJump,
    getLogbookFilterResources,
    getLogbookFilters,
    getLogbookJumps,
    JumpList,
} from "@/route-handlers/logbook/index";
import * as routes from "@/routes";

export async function renderLogbookJumps(c: AppRequestContext) {
    const options = getAppContext(c).getUser().options;
    const resources = await getLogbookFilterResources(c);
    const filters = getLogbookFilters(c, resources);
    const jumpRows = await getLogbookJumps(c, filters, getFragmentBefore(c));
    const jumpUuids = jumpRows.map((jump) => jump.uuid);
    const [aircraftsByJump, jumpTypesByJump, gearByJump] = await Promise.all([
        getAircraftsByJump(c, jumpUuids),
        getJumpTypesByJump(c, jumpUuids),
        getGearByJump(c, jumpUuids),
    ]);
    const jumpCards = jumpRows.map((jump) => ({
        ...jump,
        aircraftItems: aircraftsByJump.get(jump.uuid) ?? [],
        jumpTypeItems: jumpTypesByJump.get(jump.uuid) ?? [],
        gearItems: gearByJump.get(jump.uuid) ?? [],
        options,
    }));

    return c.render(<JumpList jumps={jumpCards} filters={filters} />);
}

function getFragmentBefore(c: AppRequestContext): number | undefined {
    const value = new URL(c.req.url).searchParams.get("before");
    if (value === null || !/^\d+$/.test(value)) {
        return undefined;
    }
    const before = Number(value);
    return Number.isSafeInteger(before) && before > 0 ? before : undefined;
}

export function register(app: App) {
    app.get(routes.logbook.jumpFragment.route, renderLogbookJumps);
}
