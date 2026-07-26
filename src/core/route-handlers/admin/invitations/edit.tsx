import { registerRoute } from "@/core/register-route";
import { eq } from "drizzle-orm";
import {
    getAppContext,
    type App,
    type AppRequestContext,
} from "@/core/create-app";
import { AppPage } from "@/core/app-page";
import {
    getInvitationFormValues,
    InvitationForm,
    InvitationSchema,
    requireAdmin,
} from "@/core/route-handlers/admin/helpers";
import * as routes from "@/core/routes";
import { invitations } from "@/core/schema";

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
        <AppPage title="Edit invitation">
            <InvitationForm
                values={{
                    code: invitation.code,
                    count: String(invitation.count),
                }}
                submitLabel="Save invitation"
                codeReadOnly
            />
        </AppPage>,
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
            <AppPage title="Edit invitation">
                <InvitationForm
                    values={values}
                    errors={result.error.issues.map((issue) => issue.message)}
                    submitLabel="Save invitation"
                    codeReadOnly
                />
            </AppPage>,
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
    registerRoute(
        app,
        "get",
        routes.admin.invitations.edit,
        renderInvitationEdit,
    );
    registerRoute(
        app,
        "post",
        routes.admin.invitations.edit,
        handleInvitationEdit,
    );
}
