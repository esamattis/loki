import { eq } from "drizzle-orm";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import { LogbookPage } from "@/app/logbook-page";
import {
    getInvitationFormValues,
    InvitationForm,
    InvitationSchema,
    requireAdmin,
} from "@/route-handlers/admin/helpers";
import * as routes from "@/routes";
import { invitations } from "@/schema";

async function renderInvitationEdit(c: AppRequestContext) {
    if (!requireAdmin(c)) {
        return c.notFound();
    }

    const code = routes.admin.invitations.edit.params(c).code;
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

    const code = routes.admin.invitations.edit.params(c).code;
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

    return c.redirect(routes.admin.index({}));
}

export function register(app: App) {
    app.get(routes.admin.invitations.edit.route, renderInvitationEdit);
    app.post(routes.admin.invitations.edit.route, handleInvitationEdit);
}
