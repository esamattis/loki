import type { App, AppRequestContext } from "@/app/app";
import { getAircraftListResponse } from "@/route-handlers/logbook/aircraft/helpers";
import * as routes from "@/routes";

export function register(app: App) {
    app.get(routes.logbook.aircraft.index.route, renderAircraftList);
}

async function renderAircraftList(c: AppRequestContext) {
    return getAircraftListResponse(c);
}
