import { useDateFormatter } from "@/app/app";
import { Button, ButtonLink } from "@/components/form";
import * as routes from "@/routes";
import type { Child } from "hono/jsx";

export interface AdminUserRow {
    uuid: string;
    username: string;
    displayName: string | null;
    email: string;
    invitationCode: string | null;
    admin: boolean;
    lastUsedAt: number;
}

export interface AdminSessionRow {
    tokenHash: string;
    username: string;
    displayName: string | null;
    createdAt: number;
    expiresAt: number;
    lastUsedAt: number;
}

export interface InvitationRow {
    code: string;
    count: number;
}

export function AdminSectionNavigation() {
    return (
        <nav
            aria-label="Admin sections"
            className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900"
        >
            {[
                ["Invitations", "#invitations"],
                ["Users", "#users"],
                ["Sessions", "#sessions"],
            ].map(([label, href]) => (
                <a
                    href={href}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                    {label}
                </a>
            ))}
        </nav>
    );
}

function MetadataItem(props: { label: string; children: Child }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {props.label}:
            </dt>
            <dd className="mt-1 break-words text-sm text-slate-700 dark:text-slate-300">
                {" "}
                {props.children}
            </dd>
        </div>
    );
}

export function AdminInvitationsSection(props: {
    invitations: InvitationRow[];
}) {
    return (
        <section id="invitations" className="space-y-4">
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
                <EmptyState>No invitations yet.</EmptyState>
            ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {props.invitations.map((invitation) => (
                        <li className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center justify-between gap-3 px-5 py-4">
                                <div className="min-w-0">
                                    <p className="truncate font-mono font-semibold text-slate-900 dark:text-slate-100">
                                        {invitation.code}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        {invitation.count} remaining
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

export function AdminUsersSection(props: {
    users: AdminUserRow[];
    currentUserUuid: string;
}) {
    const formatDate = useDateFormatter();
    return (
        <section id="users" className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Users
            </h2>
            {props.users.length === 0 ? (
                <EmptyState>No users yet.</EmptyState>
            ) : (
                <ul className="grid grid-cols-1 gap-3">
                    {props.users.map((user) => (
                        <li className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                                            {user.displayName || user.username}
                                        </p>
                                        {user.admin && (
                                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                                Admin
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        @{user.username}
                                    </p>
                                </div>
                                <UserActions
                                    user={user}
                                    currentUserUuid={props.currentUserUuid}
                                />
                            </div>
                            <dl className="grid gap-4 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-950/30">
                                <MetadataItem label="Email">
                                    {user.email}
                                </MetadataItem>
                                <MetadataItem label="Last seen">
                                    {user.lastUsedAt === 0
                                        ? "Never"
                                        : formatDate(user.lastUsedAt)}
                                </MetadataItem>
                                <MetadataItem label="Invitation code">
                                    {user.invitationCode ?? "Not recorded"}
                                </MetadataItem>
                            </dl>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function UserActions(props: { user: AdminUserRow; currentUserUuid: string }) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <form method="post" action={routes.admin.toggleAdmin({})}>
                <input type="hidden" name="uuid" value={props.user.uuid} />
                <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    className="px-3 py-2"
                >
                    {props.user.admin ? "Remove admin" : "Make admin"}
                </Button>
            </form>
            {props.user.uuid !== props.currentUserUuid && (
                <form method="post" action={routes.admin.loginAs({})}>
                    <input type="hidden" name="uuid" value={props.user.uuid} />
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
    );
}

export function AdminSessionsSection(props: { sessions: AdminSessionRow[] }) {
    const now = Math.floor(Date.now() / 1000);
    const formatDate = useDateFormatter();
    return (
        <section id="sessions" className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Sessions
            </h2>
            {props.sessions.length === 0 ? (
                <EmptyState>No sessions yet.</EmptyState>
            ) : (
                <ul className="grid grid-cols-1 gap-3">
                    {props.sessions.map((session) => (
                        <li className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                                            {session.displayName ||
                                                session.username}
                                        </p>
                                        {session.expiresAt <= now && (
                                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                Expired
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        @{session.username}
                                    </p>
                                </div>
                                <p className="font-mono text-xs text-slate-400 dark:text-slate-500">
                                    {session.tokenHash.slice(0, 12)}...
                                </p>
                            </div>
                            <dl className="grid gap-4 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-950/30">
                                <MetadataItem label="Created">
                                    {formatDate(session.createdAt)}
                                </MetadataItem>
                                <MetadataItem label="Last used">
                                    {formatDate(session.lastUsedAt)}
                                </MetadataItem>
                                <MetadataItem label="Expires">
                                    {formatDate(session.expiresAt)}
                                </MetadataItem>
                            </dl>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function EmptyState(props: { children: Child }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">
                {props.children}
            </p>
        </div>
    );
}
