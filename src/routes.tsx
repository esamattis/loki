import { route } from "./components/helpers";

export const home = route("/");
export const tailwindCss = route("/assets/tailwind.css");
export const htmxScript = route("/assets/htmx.esm.js");
export const register = route("/register");
export const login = route("/login");
export const logout = route("/logout");
export const preferences = route("/preferences");
export const logbook = route("/logbook");
export const logbookJumps = route("/logbook/__jumps");
export const logbookTransfer = route("/logbook/transfer");
export const logbookExport = route("/logbook/export");
export const logbookStatistics = route("/logbook/statistics");
export const logbookDetailedStatistics = route(
    "/logbook/statistics/detailed",
).query<{ year?: number }>();
export const jumpNew = route("/logbook/jumps/new").query<{ from?: string }>();
export const jumpEdit = route("/logbook/jumps/:uuid");
export const aircraftList = route("/logbook/aircrafts");
export const aircraftNew = route("/logbook/aircrafts/new");
export const aircraftEdit = route("/logbook/aircrafts/:uuid");
export const gearList = route("/logbook/gear");
export const gearNew = route("/logbook/gear/new");
export const gearEdit = route("/logbook/gear/:uuid");
export const jumpTypeList = route("/logbook/jump-types");
export const jumpTypeNew = route("/logbook/jump-types/new");
export const jumpTypeEdit = route("/logbook/jump-types/:uuid");
export const locationList = route("/logbook/locations");
export const locationNew = route("/logbook/locations/new");
export const locationEdit = route("/logbook/locations/:uuid");
