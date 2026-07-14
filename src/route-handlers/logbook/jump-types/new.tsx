import type { App, AppRequestContext } from "@/app/app";
import { getAppContext } from "@/app/app";
import {
    JumpTypeFormPage,
    type JumpTypeFormValues,
} from "@/route-handlers/logbook/jump-types/form";
import { ResourceSchema } from "@/route-handlers/logbook/components/resource";
import * as routes from "@/routes";
import { jumpTypes } from "@/schema";

export function register(app: App) {
    app.get(routes.logbook.jumpTypes.new.route, getNewJumpType);
    app.post(routes.logbook.jumpTypes.new.route, createJumpType);
}

function getNewJumpType(c: AppRequestContext) {
    return c.render(
        <JumpTypeFormPage title="Add jump type" submitLabel="Add jump type" />,
    );
}

async function createJumpType(c: AppRequestContext) {
    const formData = await c.req.formData();
    const values = getJumpTypeFormValues(formData);
    const result = ResourceSchema.safeParse(values);
    if (!result.success)
        return c.render(
            <JumpTypeFormPage
                title="Add jump type"
                submitLabel="Add jump type"
                values={values}
                errors={result.error.issues.map((issue) => issue.message)}
            />,
        );
    const app = getAppContext(c);
    await app.db.insert(jumpTypes).values({
        userUuid: app.getUser().uuid,
        name: result.data.name,
        previousUsageCount: result.data.previousCount,
        description: result.data.description || null,
    });
    return c.redirect(routes.logbook.jumpTypes.index({}));
}

function getJumpTypeFormValues(formData: FormData): JumpTypeFormValues {
    return {
        name: getValue(formData, "name"),
        previousCount: getValue(formData, "previousCount"),
        description: getValue(formData, "description"),
    };
}

function getValue(formData: FormData, name: string) {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
}
