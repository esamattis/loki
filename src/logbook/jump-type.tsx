import { getAppContext, app, type AppRequestContext } from "../app";
import { FormActions, Input, NumberInput, Textarea } from "../components/form";
import { ErrorList } from "../components/feedback";
import * as routes from "../routes";
import { jumpTypes } from "../schema";
import { LogbookPage } from "./layout";
import { ResourceSchema } from "./resource";

function NewJumpTypePage(props: { errors?: string[] }) {
    return (
        <LogbookPage title="Add jump type">
            <form
                method="post"
                className="max-w-xl space-y-5 rounded-lg bg-white p-5 shadow-sm"
            >
                <ErrorList
                    errors={props.errors ?? []}
                    className="border-red-300 bg-red-50 text-red-800"
                />
                <Input name="name" label="Name" required autofocus />
                <NumberInput
                    name="previousCount"
                    label="Previous usage count"
                    min="0"
                    required
                    value="0"
                />
                <Textarea name="description" label="Description" />
                <FormActions
                    submitLabel="Add jump type"
                    cancelHref={routes.logbook({})}
                />
            </form>
        </LogbookPage>
    );
}

async function handleNewJumpType(c: AppRequestContext) {
    const formData = await c.req.formData();
    const result = ResourceSchema.safeParse({
        name: formData.get("name"),
        previousCount: formData.get("previousCount"),
        description: formData.get("description"),
    });
    if (!result.success) {
        return c.render(
            <NewJumpTypePage
                errors={result.error.issues.map((issue) => issue.message)}
            />,
        );
    }
    await getAppContext(c)
        .db.insert(jumpTypes)
        .values({
            userUuid: getAppContext(c).getUser().uuid,
            name: result.data.name,
            previousUsageCount: result.data.previousCount,
            description: result.data.description || null,
        });
    return c.redirect(routes.logbook({}));
}

app.get(routes.jumpTypeNew.route, (c) => c.render(<NewJumpTypePage />));
app.post(routes.jumpTypeNew.route, handleNewJumpType);
