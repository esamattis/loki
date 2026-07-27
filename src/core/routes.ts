import { route } from "@/core/route-tools";

export const assets = {
    tailwindCss: route("/assets/:fingerprint/tailwind.css").publicAsset(),
    htmxScript: route("/assets/:fingerprint/htmx.esm.js").publicAsset(),
};
export const serviceWorker = route("/sw.js");
export const auth = {
    login: route("/login").query<{ back?: string }>().public(),
    register: route("/register").public(),
    logout: route("/logout"),
};
export const readonly = route("/readonly");
export const preferences = route("/preferences");
export const privacy = route("/privacy").query<{ back?: string }>().public();
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
