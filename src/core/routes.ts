import { route } from "@/core/route-tools";

/** Defines routes for immutable application assets. */
export const assets = {
    tailwindCss: route("/assets/:fingerprint/tailwind.css").publicAsset(),
    htmxScript: route("/assets/:fingerprint/htmx.esm.js").publicAsset(),
};
/** Stores the service worker used by this module. */
export const serviceWorker = route("/sw.js");
/** Defines routes for authentication flows. */
export const auth = {
    login: route("/login").query<{ back?: string }>().public(),
    register: route("/register").public(),
    logout: route("/logout"),
};
/** Defines the read-only notice route. */
export const readonly = route("/readonly");
/** Defines the account preferences route. */
export const preferences = route("/preferences");
/** Defines the privacy policy route. */
export const privacy = route("/privacy").query<{ back?: string }>().public();
/** Defines routes for administration flows. */
export const admin = {
    index: route("/admin"),
    loginAs: route("/admin/login-as"),
    toggleAdmin: route("/admin/toggle-admin"),
    toggleReadonly: route("/admin/toggle-readonly"),
    sessions: { index: route("/admin/sessions") },
    invitations: {
        new: route("/admin/invitations/new"),
        edit: route("/admin/invitations/:code"),
    },
};
