import { asc, desc, eq } from "drizzle-orm";
import {
    getRequestContext,
    type AppRouter,
    type HonoRequestContext,
} from "@/core/create-app";
import { AppPage } from "@/core/app-page";
import { requireAdmin } from "@/core/route-handlers/admin/helpers";
import {
    AdminInvitationsSection,
    AdminSectionNavigation,
    AdminSessionsSection,
    AdminUsersSection,
} from "@/core/route-handlers/admin/index/sections";
import * as routes from "@/core/routes";
import { invitations, sessions, users } from "@/core/schema";

/** Renders admin page. */
async function renderAdminPage(c: HonoRequestContext) {
    const admin = requireAdmin(c);
    if (!admin) {
        return c.notFound();
    }

    const db = getRequestContext(c).db;
    const [userRows, invitationRows, sessionRows] = await Promise.all([
        db
            .select({
                uuid: users.uuid,
                username: users.username,
                displayName: users.displayName,
                email: users.email,
                invitationCode: users.invitationCode,
                options: users.options,
                admin: users.admin,
                createdAt: users.createdAt,
                lastUsedAt: users.lastUsedAt,
            })
            .from(users)
            .orderBy(desc(users.createdAt))
            .all(),
        db
            .select({
                code: invitations.code,
                count: invitations.count,
            })
            .from(invitations)
            .orderBy(asc(invitations.code))
            .all(),
        db
            .select({
                tokenHash: sessions.tokenHash,
                userUuid: users.uuid,
                username: users.username,
                displayName: users.displayName,
                createdAt: sessions.createdAt,
                expiresAt: sessions.expiresAt,
                lastUsedAt: sessions.lastUsedAt,
            })
            .from(sessions)
            .innerJoin(users, eq(sessions.userUuid, users.uuid))
            .orderBy(desc(sessions.lastUsedAt))
            .all(),
    ]);

    return c.render(
        <AppPage title="Admin">
            <AdminSectionNavigation />
            <AdminInvitationsSection invitations={invitationRows} />
            <AdminUsersSection users={userRows} currentUserUuid={admin.uuid} />
            <AdminSessionsSection sessions={sessionRows} />
        </AppPage>,
    );
}

/** Registers the administrative overview route. */
export function register(app: AppRouter) {
    app.get(routes.admin.index, renderAdminPage);
}
