import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import {
    AircraftFormPage,
    getAircraftFormValues,
} from "@/route-handlers/logbook/aircraft/form";
import { ResourceSchema } from "@/route-handlers/logbook/components/resource";
import * as routes from "@/routes";
import { aircrafts } from "@/schema";

export function register(app: App) {
    app.get(routes.logbook.aircraft.new.route, getNewAircraft);
    app.post(routes.logbook.aircraft.new.route, createAircraft);
}

function getNewAircraft(c: AppRequestContext) {
    return c.render(
        <AircraftFormPage title="Add aircraft" submitLabel="Add aircraft" />,
    );
}

async function createAircraft(c: AppRequestContext) {
    const app = getAppContext(c);
    const formData = await c.req.formData();
    const values = getAircraftFormValues(formData);
    const result = ResourceSchema.safeParse(values);
    if (!result.success) {
        return c.render(
            <AircraftFormPage
                title="Add aircraft"
                submitLabel="Add aircraft"
                values={values}
                errors={result.error.issues.map((issue) => issue.message)}
            />,
        );
    }
    await app.db.insert(aircrafts).values({
        userUuid: app.getUser().uuid,
        name: result.data.name,
        previousJumpCount: result.data.previousCount,
        description: result.data.description || null,
    });
    return c.redirect(routes.logbook.aircraft.index({}));
}
