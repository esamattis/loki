import { registerRoute } from "@/core/register-route";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { useId } from "hono/jsx";
import {
    getAppContext,
    useAppContext,
    type App,
    type AppRequestContext,
} from "@/core/create-app";
import { Button, Select, Textarea } from "@/core/components/form";
import { ErrorList } from "@/core/components/feedback";
import { Password } from "@/core/route-handlers/auth/components";
import { RedirectBackAfterPost } from "@/core/components/return-after-form-post";
import { Script } from "@/core/components/script";
import { DangerZone } from "@/core/components/ui/danger-zone";
import { ConfirmDangerButton } from "@/core/components/ui/confirm-danger-button";
import { $select } from "@/core/utils";
import { DEFAULT_JUMP_IMAGE_PROMPT } from "@/app/jump-image";
import { LokiUserOptionsSchema, updateLokiOptions } from "@/app/options";
import { aircrafts, gear, jumps, jumpTypes, locations } from "@/app/schema";
import * as routes from "@/app/routes";
import { PreferencesPage } from "@/core/route-handlers/preferences/index";

const FormSchema = z.object({
    altitudeUnits: LokiUserOptionsSchema.shape.altitudeUnits,
    speedUnits: LokiUserOptionsSchema.shape.speedUnits,
    openaiApiKey: z.string(),
    jumpImagePrompt: z.string(),
});

export function LokiPreferences(
    props: {
        errors?: string[];
        values?: Record<string, string>;
    } = {},
) {
    const options = LokiUserOptionsSchema.parse(
        useAppContext().getUser().options,
    );
    const promptId = useId();
    const restoreId = useId();
    return (
        <form
            method="post"
            action={routes.lokiPreferences({})}
            data-loki-confirm="Edit Logbook Preferences"
            className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
            <RedirectBackAfterPost />
            <h2 className="text-lg font-semibold">Logbook preferences</h2>
            <ErrorList errors={props.errors ?? []} />
            <div className="grid gap-5 sm:grid-cols-2">
                <Select name="altitudeUnits" label="Altitude units">
                    <option
                        value="meters"
                        selected={
                            (props.values?.altitudeUnits ??
                                options.altitudeUnits) === "meters"
                        }
                    >
                        Meters (m)
                    </option>
                    <option
                        value="feet"
                        selected={
                            (props.values?.altitudeUnits ??
                                options.altitudeUnits) === "feet"
                        }
                    >
                        Feet (ft)
                    </option>
                </Select>
                <Select name="speedUnits" label="Speed units">
                    <option
                        value="kilometers-per-hour"
                        selected={
                            (props.values?.speedUnits ?? options.speedUnits) ===
                            "kilometers-per-hour"
                        }
                    >
                        Kilometers per hour (km/h)
                    </option>
                    <option
                        value="meters-per-second"
                        selected={
                            (props.values?.speedUnits ?? options.speedUnits) ===
                            "meters-per-second"
                        }
                    >
                        Meters per second (m/s)
                    </option>
                    <option
                        value="miles-per-hour"
                        selected={
                            (props.values?.speedUnits ?? options.speedUnits) ===
                            "miles-per-hour"
                        }
                    >
                        Miles per hour (mph)
                    </option>
                </Select>
            </div>
            <div id="openai">
                <Password
                    name="openaiApiKey"
                    label="OpenAI API key"
                    value={props.values?.openaiApiKey ?? options.openaiApiKey}
                />
            </div>
            <div id="jump-image-prompt">
                <div id={promptId}>
                    <Textarea
                        name="jumpImagePrompt"
                        label="System prompt for reading images"
                        rows={14}
                        value={
                            props.values?.jumpImagePrompt ??
                            options.jumpImagePrompt
                        }
                    />
                    <Button id={restoreId} type="button" variant="secondary">
                        Restore default system prompt
                    </Button>
                </div>
            </div>
            <Script
                $deps={[$select]}
                $args={[promptId, restoreId, DEFAULT_JUMP_IMAGE_PROMPT]}
                $exec={(promptId, restoreId, prompt) => {
                    const container = $select.id(promptId, HTMLDivElement);
                    const textarea = $select.el(
                        "textarea",
                        HTMLTextAreaElement,
                        container,
                    );
                    $select
                        .id(restoreId, HTMLButtonElement)
                        .addEventListener("click", () => {
                            textarea.value = prompt;
                            textarea.dispatchEvent(
                                new Event("input", { bubbles: true }),
                            );
                        });
                }}
            />
            <Button type="submit" variant="primary">
                Save logbook preferences
            </Button>
        </form>
    );
}

function DeleteLogbookData() {
    return (
        <section id="danger-zone">
            <DangerZone>
                <form method="post" action={routes.lokiPreferences({})}>
                    <ConfirmDangerButton
                        name="action"
                        value="delete-logbook-data"
                        label="Delete logbook data"
                        confirmLabel="Confirm delete"
                    />
                </form>
            </DangerZone>
        </section>
    );
}

export function LokiPreferencesContent(
    props: {
        errors?: string[];
        values?: Record<string, string>;
    } = {},
) {
    return (
        <>
            <LokiPreferences errors={props.errors} values={props.values} />
            <DeleteLogbookData />
        </>
    );
}

async function handle(c: AppRequestContext) {
    const context = getAppContext(c);
    const user = context.getUser();
    const form = await c.req.formData();
    if (form.get("action") === "delete-logbook-data") {
        for (const table of [jumps, gear, jumpTypes, aircrafts, locations])
            await context.db.delete(table).where(eq(table.userUuid, user.uuid));
        return c.redirect(routes.logbook.index({}));
    }
    const raw = Object.fromEntries(form.entries());
    const values = Object.fromEntries(
        Object.entries(raw).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
    );
    const result = FormSchema.safeParse(raw);
    if (!result.success)
        return c.render(
            <PreferencesPage
                appContent={
                    <LokiPreferencesContent
                        errors={result.error.issues.map(
                            (issue) => issue.message,
                        )}
                        values={values}
                    />
                }
            />,
        );
    await updateLokiOptions(user, {
        ...result.data,
        openaiApiKey: result.data.openaiApiKey.trim(),
        jumpImagePrompt:
            result.data.jumpImagePrompt.trim() || DEFAULT_JUMP_IMAGE_PROMPT,
    });
    return c.redirect(context.appOptions.authenticatedHome);
}

export function register(app: App) {
    registerRoute(app, "post", routes.lokiPreferences, handle);
}
