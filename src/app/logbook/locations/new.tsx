import type { App, AppRequestContext } from "@/core/create-app";
import { getAppContext } from "@/core/create-app";
import {
    LocationFormPage,
    type LocationFormValues,
} from "@/app/logbook/locations/form";
import { ResourceSchema } from "@/app/logbook/components/resource";
import { getFormString } from "@/core/utils";
import * as routes from "@/app/routes";
import { locations } from "@/app/schema";

export function register(app: App) {
    app.get(routes.logbook.locations.new.route, getNewLocation);
    app.post(routes.logbook.locations.new.route, createLocation);
}

function getNewLocation(c: AppRequestContext) {
    return c.render(
        <LocationFormPage title="Add location" submitLabel="Add location" />,
    );
}

async function createLocation(c: AppRequestContext) {
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
    const app = getAppContext(c);
    await app.db.insert(locations).values({
        userUuid: app.getUser().uuid,
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
