import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import {
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
    const jumpTypesByJump = await getJumpTypesByJump(
        c,
        jumpRows.map((jump) => jump.uuid),
    );
    const jumpCards = jumpRows.map((jump) => ({
        ...jump,
        jumpTypes: jumpTypesByJump.get(jump.uuid) ?? [],
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
