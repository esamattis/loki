import type { App, AppRequestContext } from "@/app/app";
import { getAppContext } from "@/app/app";
import {
    LocationFormPage,
    type LocationFormValues,
} from "@/route-handlers/logbook/locations/form";
import { ResourceSchema } from "@/route-handlers/logbook/components/resource";
import * as routes from "@/routes";
import { locations } from "@/schema";

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
        name: getValue(formData, "name"),
        previousCount: getValue(formData, "previousCount"),
        description: getValue(formData, "description"),
    };
}

function getValue(formData: FormData, name: string) {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
}
