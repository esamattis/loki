import type { AppRouter } from "@/core/create-app";
import { register as registerPrivacy } from "@/core/route-handlers/privacy";

/** Registers privacy-policy routes when the concrete app opts into them. */
export function registerPrivacyRoutes(app: AppRouter): void {
    if (app.appOptions.privacyPolicyContent) {
        registerPrivacy(app);
    }
}
