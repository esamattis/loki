import type { App, AppRequestContext } from "@/app/app";
import {
    getEditAircraftResponse,
    updateAircraft,
} from "@/route-handlers/logbook/aircraft/helpers";
import * as routes from "@/routes";

export function register(app: App) {
    app.get(routes.logbook.aircraft.edit.route, renderEditAircraft);
    app.post(routes.logbook.aircraft.edit.route, handleEditAircraft);
}

async function renderEditAircraft(c: AppRequestContext) {
    return getEditAircraftResponse(c);
}

async function handleEditAircraft(c: AppRequestContext) {
    return updateAircraft(c);
}
