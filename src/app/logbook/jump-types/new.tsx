import type { AppRouter, HonoRequestContext } from "@/core/create-app";
import { getRequestContext } from "@/core/create-app";
import {
    JumpTypeFormPage,
    type JumpTypeFormValues,
} from "@/app/logbook/jump-types/form";
import { ResourceSchema } from "@/app/logbook/components/resource";
import { getFormString } from "@/core/utils";
import * as routes from "@/app/routes";
import { jumpTypes } from "@/app/schema";

export function register(app: AppRouter) {
    app.get(routes.logbook.jumpTypes.new, getNewJumpType);
    app.post(routes.logbook.jumpTypes.new, createJumpType);
}

function getNewJumpType(c: HonoRequestContext) {
    return c.render(
        <JumpTypeFormPage title="Add jump type" submitLabel="Add jump type" />,
    );
}

async function createJumpType(c: HonoRequestContext) {
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
    const requestContext = getRequestContext(c);
    await requestContext.db.insert(jumpTypes).values({
        userUuid: requestContext.getUser().uuid,
        name: result.data.name,
        previousUsageCount: result.data.previousCount,
        description: result.data.description || null,
    });
    return c.redirect(routes.logbook.jumpTypes.index({}));
}

function getJumpTypeFormValues(formData: FormData): JumpTypeFormValues {
    return {
        name: getFormString(formData, "name"),
        previousCount: getFormString(formData, "previousCount"),
        description: getFormString(formData, "description"),
    };
}
