import { route } from "./components/helpers";

export const home = route("/");
export const register = route("/register");
export const login = route("/login");
export const logout = route("/logout");
export const logbook = route("/logbook");
export const jumpNew = route("/logbook/jumps/new");
export const jumpEdit = route("/logbook/jumps/:uuid");
export const aircraftNew = route("/logbook/aircrafts/new");
export const gearNew = route("/logbook/gear/new");
export const jumpTypeNew = route("/logbook/jump-types/new");
export const locationNew = route("/logbook/locations/new");
