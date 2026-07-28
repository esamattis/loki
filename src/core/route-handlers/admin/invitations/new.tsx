import { registerRoute } from "@/core/register-route";
import { eq } from "drizzle-orm";
import {
    getRequestContext,
    type AppRouter,
    type HonoRequestContext,
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

async function renderInvitationNew(c: HonoRequestContext) {
    if (!requireAdmin(c)) {
        return c.notFound();
    }

    return c.render(
        <AppPage title="Add invitation">
            <InvitationForm submitLabel="Create invitation" />
        </AppPage>,
    );
}

async function handleInvitationNew(c: HonoRequestContext) {
    if (!requireAdmin(c)) {
        return c.notFound();
    }

    const formData = await c.req.formData();
    const values = getInvitationFormValues(formData);
    const result = InvitationSchema.safeParse(values);
    if (!result.success) {
        return c.render(
            <AppPage title="Add invitation">
                <InvitationForm
                    values={values}
                    errors={result.error.issues.map((issue) => issue.message)}
                    submitLabel="Create invitation"
                />
            </AppPage>,
        );
    }

    const db = getRequestContext(c).db;
    const existing = await db
        .select({ code: invitations.code })
        .from(invitations)
        .where(eq(invitations.code, result.data.code))
        .get();

    if (existing) {
        return c.render(
            <AppPage title="Add invitation">
                <InvitationForm
                    values={values}
                    errors={["An invitation with this code already exists"]}
                    submitLabel="Create invitation"
                />
            </AppPage>,
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

export function register(app: AppRouter) {
    registerRoute(
        app,
        "get",
        routes.admin.invitations.new,
        renderInvitationNew,
    );
    registerRoute(
        app,
        "post",
        routes.admin.invitations.new,
        handleInvitationNew,
    );
}
