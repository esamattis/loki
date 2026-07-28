import { registerRoute } from "@/core/register-route";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { useId } from "hono/jsx";
import {
    getRequestContext,
    useRequestContext,
    type AppRouter,
    type RequestContext,
    type HonoRequestContext,
} from "@/core/create-app";
import { Button, Select, Textarea } from "@/core/components/form";
import { Script } from "@/core/components/script";
import { ConfirmDeleteButton } from "@/core/components/ui/confirm-delete-button";
import { Password } from "@/core/route-handlers/auth/components";
import { $select } from "@/core/utils";
import { DEFAULT_JUMP_IMAGE_PROMPT } from "@/app/jump-image";
import { LokiUserOptionsSchema, updateLokiOptions } from "@/app/options";
import { aircrafts, gear, jumps, jumpTypes, locations } from "@/app/schema";
import * as routes from "@/app/routes";
import {
    preferencesFieldValue,
    usePreferencesFormState,
} from "@/core/route-handlers/preferences/form-context";

const LokiPreferencesSchema = z.object({
    altitudeUnits: LokiUserOptionsSchema.shape.altitudeUnits,
    speedUnits: LokiUserOptionsSchema.shape.speedUnits,
    openaiApiKey: z.string(),
    jumpImagePrompt: z.string(),
});

export function LokiUnitsSection() {
    const options = LokiUserOptionsSchema.parse(
        useRequestContext().getUser().options,
    );
    const state = usePreferencesFormState();
    const altitudeUnits = preferencesFieldValue(
        state,
        "altitudeUnits",
        options.altitudeUnits,
    );
    const speedUnits = preferencesFieldValue(
        state,
        "speedUnits",
        options.speedUnits,
    );
    return (
        <section className="space-y-5 border-t border-slate-200 pt-8 dark:border-slate-800">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Units
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Choose how altitude and speed are displayed in your logbook.
                </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
                <Select name="altitudeUnits" label="Altitude units">
                    <option
                        value="meters"
                        selected={altitudeUnits === "meters"}
                    >
                        Meters (m)
                    </option>
                    <option value="feet" selected={altitudeUnits === "feet"}>
                        Feet (ft)
                    </option>
                </Select>
                <Select name="speedUnits" label="Speed units">
                    <option
                        value="kilometers-per-hour"
                        selected={speedUnits === "kilometers-per-hour"}
                    >
                        Kilometers per hour (km/h)
                    </option>
                    <option
                        value="meters-per-second"
                        selected={speedUnits === "meters-per-second"}
                    >
                        Meters per second (m/s)
                    </option>
                    <option
                        value="miles-per-hour"
                        selected={speedUnits === "miles-per-hour"}
                    >
                        Miles per hour (mph)
                    </option>
                </Select>
            </div>
        </section>
    );
}

export function LokiJumpFromImageSection() {
    const options = LokiUserOptionsSchema.parse(
        useRequestContext().getUser().options,
    );
    const state = usePreferencesFormState();
    const promptContainerId = useId();
    const restorePromptButtonId = useId();
    return (
        <section
            id="openai"
            className="scroll-mt-4 space-y-5 border-t border-slate-200 pt-8 dark:border-slate-800"
        >
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    OpenAI API Key
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Configure OpenAI so you can create jumps from photos of
                    logbook pages, altimeters, or freefall computers.
                </p>
            </div>
            <Password
                name="openaiApiKey"
                label="OpenAI API key"
                placeholder="sk-..."
                value={preferencesFieldValue(
                    state,
                    "openaiApiKey",
                    options.openaiApiKey,
                )}
            />
            <div id="jump-image-prompt" className="scroll-mt-4">
                <div id={promptContainerId}>
                    <Textarea
                        name="jumpImagePrompt"
                        label="System prompt for reading images"
                        rows={14}
                        value={
                            preferencesFieldValue(
                                state,
                                "jumpImagePrompt",
                                options.jumpImagePrompt,
                            ) || DEFAULT_JUMP_IMAGE_PROMPT
                        }
                    />
                    <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                        Standing instructions sent with every jump-from-image
                        request. For one-off notes, use Additional context on
                        the read page instead.
                    </p>
                    <Button
                        id={restorePromptButtonId}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mt-2"
                    >
                        Restore default system prompt
                    </Button>
                </div>
                <Script
                    $deps={[$select]}
                    $args={[
                        promptContainerId,
                        restorePromptButtonId,
                        DEFAULT_JUMP_IMAGE_PROMPT,
                    ]}
                    $exec={(containerId, buttonId, defaultPrompt) => {
                        const container = $select.id(containerId, HTMLElement);
                        const textarea = $select.el(
                            'textarea[name="jumpImagePrompt"]',
                            HTMLTextAreaElement,
                            container,
                        );
                        const button = $select.id(buttonId, HTMLButtonElement);
                        button.addEventListener("click", () => {
                            textarea.value = defaultPrompt;
                            textarea.dispatchEvent(
                                new Event("input", { bubbles: true }),
                            );
                            textarea.focus();
                        });
                    }}
                />
            </div>
        </section>
    );
}

export function LokiPreferencesDangerContent() {
    return (
        <div className="space-y-3">
            <p className="text-sm text-red-700/90 dark:text-red-300/90">
                Permanently delete all jumps and jump items, including gear,
                locations, aircraft, and jump types. Your account and
                preferences will remain. This cannot be undone.
            </p>
            <ConfirmDeleteButton
                label="Delete logbook data"
                action="delete-logbook-data"
                formAction={routes.lokiPreferences({})}
            />
        </div>
    );
}

export function validateLokiPreferencesForm(
    formValues: Readonly<Record<string, string>>,
): string[] {
    const result = LokiPreferencesSchema.safeParse(formValues);
    if (result.success) return [];
    return result.error.issues.map((issue) => issue.message);
}

export async function saveLokiPreferencesForm(
    context: RequestContext,
    formValues: Readonly<Record<string, string>>,
): Promise<void> {
    const result = LokiPreferencesSchema.parse(formValues);
    await updateLokiOptions(context.getUser(), {
        altitudeUnits: result.altitudeUnits,
        speedUnits: result.speedUnits,
        openaiApiKey: result.openaiApiKey.trim(),
        jumpImagePrompt:
            result.jumpImagePrompt.trim() || DEFAULT_JUMP_IMAGE_PROMPT,
    });
}

async function handleDeleteLogbookData(c: HonoRequestContext) {
    const context = getRequestContext(c);
    const user = context.getUser();
    const form = await c.req.formData();
    if (form.get("action") !== "delete-logbook-data")
        return c.redirect(routes.logbook.index({}));
    for (const table of [jumps, gear, jumpTypes, aircrafts, locations])
        await context.db.delete(table).where(eq(table.userUuid, user.uuid));
    return c.redirect(routes.logbook.index({}));
}

export function register(app: AppRouter) {
    registerRoute(app, "post", routes.lokiPreferences, handleDeleteLogbookData);
}
