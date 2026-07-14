import { asc, desc, eq } from "drizzle-orm";
import {
    getAppContext,
    useAppContext,
    type App,
    type AppRequestContext,
} from "@/app/app";
import { formatUnixDateTime } from "@/date-time";
import { Button, ButtonLink } from "@/components/form";
import { LogbookPage } from "@/app/authenticated-page";
import { requireAdmin } from "@/route-handlers/admin/helpers";
import * as routes from "@/routes";
import { invitations, sessions, users } from "@/schema";

interface AdminUserRow {
    uuid: string;
    username: string;
    displayName: string | null;
    email: string;
    admin: boolean;
}

interface InvitationRow {
    code: string;
    count: number;
}

function AdminUsersSection(props: {
    users: AdminUserRow[];
    currentUserUuid: string;
}) {
    return (
        <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Users
            </h2>
            {props.users.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        No users yet.
                    </p>
                </div>
            ) : (
                <ul className="grid grid-cols-1 gap-3">
                    {props.users.map((user) => (
                        <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                                        {user.displayName || user.username}
                                        {user.admin && (
                                            <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-normal text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                                Admin
                                            </span>
                                        )}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        @{user.username} · {user.email}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <form
                                        method="post"
                                        action={routes.admin.toggleAdmin({})}
                                    >
                                        <input
                                            type="hidden"
                                            name="uuid"
                                            value={user.uuid}
                                        />
                                        <Button
                                            type="submit"
                                            variant="secondary"
                                            size="sm"
                                            className="px-3 py-2"
                                        >
                                            {user.admin
                                                ? "Remove admin"
                                                : "Make admin"}
                                        </Button>
                                    </form>
                                    {user.uuid !== props.currentUserUuid && (
                                        <form
                                            method="post"
                                            action={routes.admin.loginAs({})}
                                        >
                                            <input
                                                type="hidden"
                                                name="uuid"
                                                value={user.uuid}
                                            />
                                            <Button
                                                type="submit"
                                                variant="secondary"
                                                size="sm"
                                                className="px-3 py-2"
                                            >
                                                Log in as
                                            </Button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

interface AdminSessionRow {
    tokenHash: string;
    username: string;
    displayName: string | null;
    createdAt: number;
    expiresAt: number;
    lastUsedAt: number;
}

function AdminSessionsSection(props: { sessions: AdminSessionRow[] }) {
    const now = Math.floor(Date.now() / 1000);
    const dateTimeFormat = useAppContext().getUser().options.dateTimeFormat;
    return (
        <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Sessions
            </h2>
            {props.sessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        No sessions yet.
                    </p>
                </div>
            ) : (
                <ul className="grid grid-cols-1 gap-3">
                    {props.sessions.map((session) => {
                        const expired = session.expiresAt <= now;
                        return (
                            <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                                            {session.displayName ||
                                                session.username}
                                            {expired && (
                                                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                    Expired
                                                </span>
                                            )}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                            @{session.username}
                                        </p>
                                        <p className="mt-1 font-mono text-xs text-slate-400 dark:text-slate-500">
                                            {session.tokenHash.slice(0, 12)}…
                                        </p>
                                    </div>
                                    <div className="text-right text-sm text-slate-500 dark:text-slate-400">
                                        <p>
                                            Created{" "}
                                            {formatUnixDateTime(
                                                session.createdAt,
                                                dateTimeFormat,
                                            )}
                                        </p>
                                        <p className="mt-1">
                                            Last used{" "}
                                            {formatUnixDateTime(
                                                session.lastUsedAt,
                                                dateTimeFormat,
                                            )}
                                        </p>
                                        <p className="mt-1">
                                            Expires{" "}
                                            {formatUnixDateTime(
                                                session.expiresAt,
                                                dateTimeFormat,
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

function AdminInvitationsSection(props: { invitations: InvitationRow[] }) {
    return (
        <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Invitations
                </h2>
                <ButtonLink
                    href={routes.admin.invitations.new({})}
                    variant="primary"
                    className="gap-1.5"
                >
                    Add invitation
                </ButtonLink>
            </div>
            {props.invitations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        No invitations yet.
                    </p>
                </div>
            ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {props.invitations.map((invitation) => (
                        <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-black/30">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                                        {invitation.code}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        Remaining uses: {invitation.count}
                                    </p>
                                </div>
                                <ButtonLink
                                    href={routes.admin.invitations.edit({
                                        code: invitation.code,
                                    })}
                                    variant="secondary"
                                    size="sm"
                                >
                                    Edit
                                </ButtonLink>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

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
                admin: users.admin,
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
            <AdminUsersSection users={userRows} currentUserUuid={admin.uuid} />
            <AdminSessionsSection sessions={sessionRows} />
            <AdminInvitationsSection invitations={invitationRows} />
        </LogbookPage>,
    );
}

export function register(app: App) {
    app.get(routes.admin.index.route, renderAdminPage);
}
