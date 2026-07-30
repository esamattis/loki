import type { AppRouter, HonoRequestContext } from "@/core/create-app";
import { getRequestContext } from "@/core/create-app";
import {
    LocationFormPage,
    type LocationFormValues,
} from "@/app/logbook/locations/form";
import { ResourceSchema } from "@/app/logbook/components/resource";
import { getFormString } from "@/core/utils";
import * as routes from "@/app/routes";
import { locations } from "@/app/schema";

export function register(app: AppRouter) {
    app.get(routes.logbook.locations.new, getNewLocation);
    app.post(routes.logbook.locations.new, createLocation);
}

function getNewLocation(c: HonoRequestContext) {
    return c.render(
        <LocationFormPage title="Add location" submitLabel="Add location" />,
    );
}

async function createLocation(c: HonoRequestContext) {
    const formData = await c.req.formData();
    const values = getLocationFormValues(formData);
    const result = ResourceSchema.safeParse(values);
    if (!result.success)
        return c.render(
            <LocationFormPage
                title="Add location"
                submitLabel="Add location"
                values={values}
                errors={result.error.issues.map((issue) => issue.message)}
            />,
        );
    const requestContext = getRequestContext(c);
    await requestContext.db.insert(locations).values({
        userUuid: requestContext.getUser().uuid,
        name: result.data.name,
        previousJumpCount: result.data.previousCount,
        description: result.data.description || null,
    });
    return c.redirect(routes.logbook.locations.index({}));
}

function getLocationFormValues(formData: FormData): LocationFormValues {
    return {
        name: getFormString(formData, "name"),
        previousCount: getFormString(formData, "previousCount"),
        description: getFormString(formData, "description"),
    };
}
