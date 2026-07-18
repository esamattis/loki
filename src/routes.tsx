import { route } from "@/route-tools";

/**
 * Route helpers are the URL contract and mirror `src/route-handlers/`.
 *
 * Group helpers by URL hierarchy: `routes.logbook.jumps.edit` belongs in
 * `route-handlers/logbook/jumps/edit.tsx`. Use `index.tsx` for a collection
 * or section root, `new.tsx` for creation, and `edit.tsx` for a parameterized
 * resource page. Each handler exports `register(app)` for only its own routes;
 * `app/register-routes.ts` is the sole registration composition root.
 *
 * A `__` URL segment denotes an HTMX fragment, not a full page. Name its
 * helper after the fragment (for example, `jumpFragment`) and keep its handler
 * next to the owning page. Fragment responses intentionally skip the document
 * renderer, so never link users to them as standalone pages.
 */
export type JumpPrefillQuery = {
    from?: string;
    fromImage?: string;
    imageId?: string;
    jumpDate?: string;
    jumpNumber?: string;
    exitAltitude?: string;
    openingAltitude?: string;
    freefallTime?: string;
    locationUuid?: string;
    aircraftUuids?: string;
    gearUuids?: string;
    jumpTypeUuids?: string;
    locationName?: string;
    aircraftName?: string;
    gearName?: string;
    jumpTypeName?: string;
    description?: string;
};

export const home = route("/");
export const assets = {
    tailwindCss: route("/assets/:fingerprint/tailwind.css"),
    htmxScript: route("/assets/:fingerprint/htmx.esm.js"),
};
export const serviceWorker = route("/sw.js");
export const auth = {
    login: route("/login"),
    register: route("/register"),
    logout: route("/logout"),
};
export const preferences = route("/preferences").query<{ back?: string }>();
export const install = route("/install");
export const about = route("/about");
export const todo = route("/todo");
export const logbook = {
    index: route("/logbook"),
    jumpFragment: route("/logbook/__jumps"),
    transfer: {
        index: route("/logbook/transfer"),
        export: route("/logbook/export"),
    },
    statistics: {
        index: route("/logbook/statistics"),
        detailed: route("/logbook/statistics/detailed").query<{
            year?: number;
        }>(),
    },
    jumps: {
        new: route("/logbook/jumps/new").query<JumpPrefillQuery>(),
        jumpNumberError: route("/logbook/jumps/new/__jump-number-error").query<{
            jumpNumber?: string;
        }>(),
        fromImage: route("/logbook/jumps/new/from-image"),
        imageShare: route("/logbook/jumps/new/from-image/share"),
        edit: route("/logbook/jumps/:uuid"),
    },
    aircraft: {
        index: route("/logbook/aircrafts"),
        new: route("/logbook/aircrafts/new"),
        edit: route("/logbook/aircrafts/:uuid"),
    },
    gear: {
        index: route("/logbook/gear"),
        new: route("/logbook/gear/new"),
        edit: route("/logbook/gear/:uuid"),
    },
    jumpTypes: {
        index: route("/logbook/jump-types"),
        new: route("/logbook/jump-types/new"),
        edit: route("/logbook/jump-types/:uuid"),
    },
    locations: {
        index: route("/logbook/locations"),
        new: route("/logbook/locations/new"),
        edit: route("/logbook/locations/:uuid"),
    },
};
export const admin = {
    index: route("/admin"),
    loginAs: route("/admin/login-as"),
    toggleAdmin: route("/admin/toggle-admin"),
    invitations: {
        new: route("/admin/invitations/new"),
        edit: route("/admin/invitations/:code"),
    },
};
