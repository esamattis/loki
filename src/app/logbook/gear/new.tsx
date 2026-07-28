import { registerRoute } from "@/core/register-route";
import type { AppRouter, HonoRequestContext } from "@/core/create-app";
import { getRequestContext } from "@/core/create-app";
import { GearFormPage, type GearFormValues } from "@/app/logbook/gear/form";
import { ResourceSchema } from "@/app/logbook/components/resource";
import { getFormString } from "@/core/utils";
import * as routes from "@/app/routes";
import { gear } from "@/app/schema";

export function register(app: AppRouter) {
    registerRoute(app, "get", routes.logbook.gear.new, getNewGear);
    registerRoute(app, "post", routes.logbook.gear.new, createGear);
}

function getNewGear(c: HonoRequestContext) {
    return c.render(<GearFormPage title="Add gear" submitLabel="Add gear" />);
}

async function createGear(c: HonoRequestContext) {
    const formData = await c.req.formData();
    const values = getGearFormValues(formData);
    const result = ResourceSchema.safeParse(values);
    if (!result.success)
        return c.render(
            <GearFormPage
                title="Add gear"
                submitLabel="Add gear"
                values={values}
                errors={result.error.issues.map((issue) => issue.message)}
            />,
        );
    const requestContext = getRequestContext(c);
    await requestContext.db.insert(gear).values({
        userUuid: requestContext.getUser().uuid,
        name: result.data.name,
        previousUsageCount: result.data.previousCount,
        description: result.data.description || null,
    });
    return c.redirect(routes.logbook.gear.index({}));
}

function getGearFormValues(formData: FormData): GearFormValues {
    return {
        name: getFormString(formData, "name"),
        previousCount: getFormString(formData, "previousCount"),
        description: getFormString(formData, "description"),
    };
}
