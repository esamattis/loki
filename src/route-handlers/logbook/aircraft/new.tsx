import type { App, AppRequestContext } from "@/app/app";
import {
    createAircraft,
    getNewAircraftResponse,
} from "@/route-handlers/logbook/aircraft/helpers";
import * as routes from "@/routes";

export function register(app: App) {
    app.get(routes.logbook.aircraft.new.route, renderNewAircraft);
    app.post(routes.logbook.aircraft.new.route, handleNewAircraft);
}

function renderNewAircraft(c: AppRequestContext) {
    return getNewAircraftResponse(c);
}

async function handleNewAircraft(c: AppRequestContext) {
    return createAircraft(c);
}
