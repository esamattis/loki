import type { App } from "@/core/create-app";
import { registerAssetRoutes } from "@/core/route-handlers/assets";
import { register as registerLogin } from "@/core/route-handlers/auth/login";
import { register as registerRegistration } from "@/core/route-handlers/auth/register";
import { register as registerLogout } from "@/core/route-handlers/auth/logout";
import { register as registerReadonly } from "@/core/route-handlers/readonly";
import { register as registerPreferences } from "@/core/route-handlers/preferences/index";
import { register as registerPrivacy } from "@/core/route-handlers/privacy";
import { register as registerTodo } from "@/core/route-handlers/todo";
import { register as registerAdmin } from "@/core/route-handlers/admin/index";
import { register as registerLoginAs } from "@/core/route-handlers/admin/login-as";
import { register as registerToggleAdmin } from "@/core/route-handlers/admin/toggle-admin";
import { register as registerToggleReadonly } from "@/core/route-handlers/admin/toggle-readonly";
import { register as registerAdminSessions } from "@/core/route-handlers/admin/sessions/index";
import { register as registerNewInvitation } from "@/core/route-handlers/admin/invitations/new";
import { register as registerEditInvitation } from "@/core/route-handlers/admin/invitations/edit";
import { registerRouteAccess } from "@/core/register-route";
import { assets, auth, privacy, todo } from "@/core/routes";

export function registerCoreRoutes(app: App): void {
    for (const route of [
        assets.tailwindCss,
        assets.htmxScript,
        auth.login,
        auth.register,
        privacy,
        todo,
    ])
        registerRouteAccess(app, route);
    registerAssetRoutes(app);
    registerLogin(app);
    registerRegistration(app);
    registerLogout(app);
    registerReadonly(app);
    registerPreferences(app);
    registerPrivacy(app);
    registerTodo(app);
    registerAdmin(app);
    registerLoginAs(app);
    registerToggleAdmin(app);
    registerToggleReadonly(app);
    registerAdminSessions(app);
    registerNewInvitation(app);
    registerEditInvitation(app);
}
