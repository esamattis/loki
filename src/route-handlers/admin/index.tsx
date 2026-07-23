import { asc, desc, eq } from "drizzle-orm";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import { LogbookPage } from "@/app/logbook-page";
import { requireAdmin } from "@/route-handlers/admin/helpers";
import {
    AdminInvitationsSection,
    AdminSectionNavigation,
    AdminSessionsSection,
    AdminUsersSection,
} from "@/route-handlers/admin/index/sections";
import * as routes from "@/routes";
import { invitations, sessions, users } from "@/schema";

async function renderAdminPage(c: AppRequestContext) {
    const admin = requireAdmin(c);
    if (!admin) {
        return c.notFound();
    }

    const db = getAppContext(c).db;
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
            .orderBy(asc(users.username))
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
            .orderBy(desc(sessions.createdAt))
            .all(),
    ]);

    return c.render(
        <LogbookPage title="Admin">
            <AdminSectionNavigation />
            <AdminInvitationsSection invitations={invitationRows} />
            <AdminUsersSection users={userRows} currentUserUuid={admin.uuid} />
            <AdminSessionsSection sessions={sessionRows} />
        </LogbookPage>,
    );
}

export function register(app: App) {
    app.get(routes.admin.index.route, renderAdminPage);
}
