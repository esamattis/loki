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

    return c.redirect(routes.admin.index({}));
}

export function register(app: App) {
    app.get(routes.admin.invitations.new.route, renderInvitationNew);
    app.post(routes.admin.invitations.new.route, handleInvitationNew);
}
