import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { app, getAppContext, type AppRequestContext, type User } from "./app";
import { FormActions, Input, NumberInput } from "./components/form";
import { ErrorList } from "./components/feedback";
import { LogbookPage } from "./logbook/layout";
import { createSession } from "./login";
import * as routes from "./routes";
import { invitations, sessions, users } from "./schema";

function requireAdmin(c: AppRequestContext): User | null {
    const user = getAppContext(c).getUser();
    if (!user.admin) {
        return null;
    }
    return user;
}

const InvitationSchema = z.object({
    code: z
        .string()
        .trim()
        .min(1, "Code is required")
        .max(100, "Code is too long"),
    count: z.coerce
        .number()
        .int("Count must be an integer")
        .min(0, "Count must be 0 or greater"),
});

interface InvitationFormValues {
    code?: string;
    count?: string;
}

function InvitationForm(props: {
    values?: InvitationFormValues;
    errors?: string[];
    submitLabel: string;
    codeReadOnly?: boolean;
}) {
    const values = props.values ?? {};
    return (
        <form
            method="post"
            className="max-w-xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
            <ErrorList
                errors={props.errors ?? []}
                className="border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
            />
            {props.codeReadOnly ? (
                <div>
                    <p className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Invitation code
                    </p>
                    <p className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                        {values.code}
                    </p>
                    <input type="hidden" name="code" value={values.code} />
                </div>
            ) : (
                <Input
                    name="code"
                    label="Invitation code"
                    required
                    autofocus
                    value={values.code}
                />
            )}
            <NumberInput
                name="count"
                label="Remaining uses"
                min="0"
                required
                value={values.count ?? "0"}
            />
            <FormActions
                submitLabel={props.submitLabel}
                cancelHref={routes.admin({})}
            />
        </form>
    );
}

function getInvitationFormValues(formData: FormData): InvitationFormValues {
    function getValue(name: string): string {
        const value = formData.get(name);
        return typeof value === "string" ? value : "";
    }
    return {
        code: getValue("code"),
        count: getValue("count"),
    };
}

const actionButtonClassName =
    "inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-indigo-400/40";

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
                                        action={routes.adminToggleAdmin({})}
                                    >
                                        <input
                                            type="hidden"
                                            name="uuid"
                                            value={user.uuid}
                                        />
                                        <button
                                            type="submit"
                                            className={actionButtonClassName}
                                        >
                                            {user.admin
                                                ? "Remove admin"
                                                : "Make admin"}
                                        </button>
                                    </form>
                                    {user.uuid !== props.currentUserUuid && (
                                        <form
                                            method="post"
                                            action={routes.adminLoginAs({})}
                                        >
                                            <input
                                                type="hidden"
                                                name="uuid"
                                                value={user.uuid}
                                            />
                                            <button
                                                type="submit"
                                                className={
                                                    actionButtonClassName
                                                }
                                            >
                                                Log in as
                                            </button>
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
}

function formatUnixSeconds(seconds: number): string {
    return new Date(seconds * 1000)
        .toISOString()
        .replace("T", " ")
        .slice(0, 19);
}

function AdminSessionsSection(props: { sessions: AdminSessionRow[] }) {
    const now = Math.floor(Date.now() / 1000);
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
                                            {formatUnixSeconds(
                                                session.createdAt,
                                            )}
                                        </p>
                                        <p className="mt-1">
                                            Expires{" "}
                                            {formatUnixSeconds(
                                                session.expiresAt,
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
                <a
                    href={routes.adminInvitationNew({})}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus:ring-indigo-400/40"
                >
                    Add invitation
                </a>
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
                                <a
                                    href={routes.adminInvitationEdit({
                                        code: invitation.code,
                                    })}
                                    className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-indigo-400/40"
                                >
                                    Edit
                                </a>
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

async function handleLoginAs(c: AppRequestContext) {
    const admin = requireAdmin(c);
    if (!admin) {
        return c.notFound();
    }

    const formData = await c.req.formData();
    const uuidValue = formData.get("uuid");
    const uuid = typeof uuidValue === "string" ? uuidValue : "";
    if (!uuid) {
        return c.redirect(routes.admin({}));
    }

    const target = await getAppContext(c)
        .db.select({ uuid: users.uuid })
        .from(users)
        .where(eq(users.uuid, uuid))
        .limit(1)
        .get();

    if (!target) {
        return c.notFound();
    }

    await createSession(c, target.uuid);
    return c.redirect(routes.logbook({}));
}

async function handleToggleAdmin(c: AppRequestContext) {
    if (!requireAdmin(c)) {
        return c.notFound();
    }

    const formData = await c.req.formData();
    const uuidValue = formData.get("uuid");
    const uuid = typeof uuidValue === "string" ? uuidValue : "";
    if (!uuid) {
        return c.redirect(routes.admin({}));
    }

    const db = getAppContext(c).db;
    const target = await db
        .select({
            uuid: users.uuid,
            admin: users.admin,
        })
        .from(users)
        .where(eq(users.uuid, uuid))
        .limit(1)
        .get();

    if (!target) {
        return c.notFound();
    }

    await db
        .update(users)
        .set({ admin: !target.admin })
        .where(eq(users.uuid, uuid))
        .run();

    return c.redirect(routes.admin({}));
}

async function renderInvitationNew(c: AppRequestContext) {
    if (!requireAdmin(c)) {
        return c.notFound();
    }

    return c.render(
        <LogbookPage title="Add invitation">
            <InvitationForm submitLabel="Create invitation" />
        </LogbookPage>,
    );
}

async function handleInvitationNew(c: AppRequestContext) {
    if (!requireAdmin(c)) {
        return c.notFound();
    }

    const formData = await c.req.formData();
    const values = getInvitationFormValues(formData);
    const result = InvitationSchema.safeParse(values);
    if (!result.success) {
        return c.render(
            <LogbookPage title="Add invitation">
                <InvitationForm
                    values={values}
                    errors={result.error.issues.map((issue) => issue.message)}
                    submitLabel="Create invitation"
                />
            </LogbookPage>,
        );
    }

    const db = getAppContext(c).db;
    const existing = await db
        .select({ code: invitations.code })
        .from(invitations)
        .where(eq(invitations.code, result.data.code))
        .get();

    if (existing) {
        return c.render(
            <LogbookPage title="Add invitation">
                <InvitationForm
                    values={values}
                    errors={["An invitation with this code already exists"]}
                    submitLabel="Create invitation"
                />
            </LogbookPage>,
        );
    }

    await db
        .insert(invitations)
        .values({
            code: result.data.code,
            count: result.data.count,
        })
        .run();

    return c.redirect(routes.admin({}));
}

async function renderInvitationEdit(c: AppRequestContext) {
    if (!requireAdmin(c)) {
        return c.notFound();
    }

    const code = routes.adminInvitationEdit.params(c).code;
    if (!code) {
        return c.notFound();
    }

    const invitation = await getAppContext(c)
        .db.select({
            code: invitations.code,
            count: invitations.count,
        })
        .from(invitations)
        .where(eq(invitations.code, code))
        .get();

    if (!invitation) {
        return c.notFound();
    }

    return c.render(
        <LogbookPage title="Edit invitation">
            <InvitationForm
                values={{
                    code: invitation.code,
                    count: String(invitation.count),
                }}
                submitLabel="Save invitation"
                codeReadOnly
            />
        </LogbookPage>,
    );
}

async function handleInvitationEdit(c: AppRequestContext) {
    if (!requireAdmin(c)) {
        return c.notFound();
    }

    const code = routes.adminInvitationEdit.params(c).code;
    if (!code) {
        return c.notFound();
    }

    const formData = await c.req.formData();
    const values = getInvitationFormValues(formData);
    values.code = code;

    const result = InvitationSchema.safeParse(values);
    if (!result.success) {
        return c.render(
            <LogbookPage title="Edit invitation">
                <InvitationForm
                    values={values}
                    errors={result.error.issues.map((issue) => issue.message)}
                    submitLabel="Save invitation"
                    codeReadOnly
                />
            </LogbookPage>,
        );
    }

    const db = getAppContext(c).db;
    const existing = await db
        .select({ code: invitations.code })
        .from(invitations)
        .where(eq(invitations.code, code))
        .get();

    if (!existing) {
        return c.notFound();
    }

    await db
        .update(invitations)
        .set({ count: result.data.count })
        .where(eq(invitations.code, code))
        .run();

    return c.redirect(routes.admin({}));
}

app.get(routes.admin.route, renderAdminPage);
app.post(routes.adminLoginAs.route, handleLoginAs);
app.post(routes.adminToggleAdmin.route, handleToggleAdmin);
app.get(routes.adminInvitationNew.route, renderInvitationNew);
app.post(routes.adminInvitationNew.route, handleInvitationNew);
app.get(routes.adminInvitationEdit.route, renderInvitationEdit);
app.post(routes.adminInvitationEdit.route, handleInvitationEdit);
