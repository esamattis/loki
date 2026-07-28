import { registerRoute } from "@/core/register-route";
import {
    getRequestContext,
    type AppRouter,
    type HonoRequestContext,
} from "@/core/create-app";
import {
    getAircraftsByJump,
    getGearByJump,
    getJumpTypesByJump,
    getLogbookFilterResources,
    getLogbookFilters,
    getLogbookJumps,
    JumpList,
} from "@/app/logbook/index";
import { getLokiUserOptions } from "@/app/options";
import * as routes from "@/app/routes";

export async function renderLogbookJumps(c: HonoRequestContext) {
    const options = getLokiUserOptions(getRequestContext(c).getUser());
    const resources = await getLogbookFilterResources(c);
    const filters = getLogbookFilters(c, resources);
    const offset = getFragmentOffset(c);
    const jumpRows = await getLogbookJumps(c, filters, offset);
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

    return c.render(
        <JumpList jumps={jumpCards} filters={filters} offset={offset} />,
    );
}

function getFragmentOffset(c: HonoRequestContext): number {
    const value = new URL(c.req.url).searchParams.get("offset");
    if (value === null || !/^\d+$/.test(value)) {
        return 0;
    }
    const offset = Number(value);
    return Number.isSafeInteger(offset) && offset > 0 ? offset : 0;
}

export function register(app: AppRouter) {
    registerRoute(app, "get", routes.logbook.jumpFragment, renderLogbookJumps);
}
