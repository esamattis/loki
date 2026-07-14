import type { App, AppRequestContext } from "@/app/app";
import { getAppContext } from "@/app/app";
import {
    GearFormPage,
    type GearFormValues,
} from "@/route-handlers/logbook/gear/form";
import { ResourceSchema } from "@/route-handlers/logbook/components/resource";
import * as routes from "@/routes";
import { gear } from "@/schema";

export function register(app: App) {
    app.get(routes.logbook.gear.new.route, getNewGear);
    app.post(routes.logbook.gear.new.route, createGear);
}

function getNewGear(c: AppRequestContext) {
    return c.render(<GearFormPage title="Add gear" submitLabel="Add gear" />);
}

async function createGear(c: AppRequestContext) {
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
    const app = getAppContext(c);
    await app.db.insert(gear).values({
        userUuid: app.getUser().uuid,
        name: result.data.name,
        previousUsageCount: result.data.previousCount,
        description: result.data.description || null,
    });
    return c.redirect(routes.logbook.gear.index({}));
}

function getGearFormValues(formData: FormData): GearFormValues {
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
