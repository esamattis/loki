import {
    getRequestContext,
    type AppRouter,
    type HonoRequestContext,
} from "@/core/create-app";
import {
    AircraftFormPage,
    getAircraftFormValues,
} from "@/app/logbook/aircraft/form";
import { ResourceSchema } from "@/app/logbook/components/resource";
import * as routes from "@/app/routes";
import { aircrafts } from "@/app/schema";

export function register(app: AppRouter) {
    app.get(routes.logbook.aircraft.new, getNewAircraft);
    app.post(routes.logbook.aircraft.new, createAircraft);
}

function getNewAircraft(c: HonoRequestContext) {
    return c.render(
        <AircraftFormPage title="Add aircraft" submitLabel="Add aircraft" />,
    );
}

async function createAircraft(c: HonoRequestContext) {
    const requestContext = getRequestContext(c);
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
    await requestContext.db.insert(aircrafts).values({
        userUuid: requestContext.getUser().uuid,
        name: result.data.name,
        previousJumpCount: result.data.previousCount,
        description: result.data.description || null,
    });
    return c.redirect(routes.logbook.aircraft.index({}));
}
