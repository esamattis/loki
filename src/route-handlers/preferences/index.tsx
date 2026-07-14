import { and, eq, ne } from "drizzle-orm";
import { useId } from "hono/jsx";
import { z } from "zod";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import {
    Button,
    FormActions,
    Input,
    NumberInput,
    Select,
    Textarea,
} from "@/components/form";
import { ErrorList } from "@/components/feedback";
import { Script } from "@/components/script";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { DangerZone } from "@/components/ui/danger-zone";
import { hashPassword } from "@/auth";
import { Password } from "@/route-handlers/auth/components";
import { destroySession } from "@/route-handlers/auth/sessions";
import {
    DEFAULT_JUMP_IMAGE_MODEL,
    DEFAULT_JUMP_IMAGE_PROMPT,
    JUMP_IMAGE_MODELS,
    UserOptionsSchema,
    type UserOptions,
} from "@/options";
import * as routes from "@/routes";
import { aiUsage, users } from "@/schema";
import { LogbookPage } from "@/app/authenticated-page";
import { $assertElement, $showAndroidChromeHint } from "@/utils";

const PreferencesSchema = z
    .object({
        displayName: z.string().trim(),
        email: z
            .string()
            .trim()
            .min(1, "Email is required")
            .email("Invalid email address"),
        password: z.string(),
        confirmPassword: z.string(),
        altitudeUnits: UserOptionsSchema.shape.altitudeUnits,
        speedUnits: UserOptionsSchema.shape.speedUnits,
        dateTimeFormat: UserOptionsSchema.shape.dateTimeFormat,
        previousJumpCount: UserOptionsSchema.shape.previousJumpCount,
        openaiApiKey: z.string(),
        jumpImagePrompt: z.string(),
        jumpImageModel: UserOptionsSchema.shape.jumpImageModel,
    })
    .superRefine((data, ctx) => {
        const changingPassword =
            data.password.length > 0 || data.confirmPassword.length > 0;
        if (!changingPassword) {
            return;
        }
        if (data.password.length < 6) {
            ctx.addIssue({
                code: "custom",
                message: "Password must be at least 6 characters",
                path: ["password"],
            });
        }
        if (!data.confirmPassword) {
            ctx.addIssue({
                code: "custom",
                message: "Confirm your new password",
                path: ["confirmPassword"],
            });
        } else if (data.password !== data.confirmPassword) {
            ctx.addIssue({
                code: "custom",
                message: "Passwords do not match",
                path: ["confirmPassword"],
            });
        }
    });

interface PreferencesFormValues {
    displayName: string;
    email: string;
    options: UserOptions;
}

function JumpHistorySection(props: { options: UserOptions }) {
    return (
        <section className="space-y-5 border-t border-slate-200 pt-8 dark:border-slate-800">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Jump history
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Include jumps completed before this logbook in overall
                    totals.
                </p>
            </div>
            <NumberInput
                name="previousJumpCount"
                label="Previous jumps outside this logbook"
                min="0"
                value={String(props.options.previousJumpCount)}
            />
        </section>
    );
}

function UnitsSection(props: { options: UserOptions }) {
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
                        selected={props.options.altitudeUnits === "meters"}
                    >
                        Meters (m)
                    </option>
                    <option
                        value="feet"
                        selected={props.options.altitudeUnits === "feet"}
                    >
                        Feet (ft)
                    </option>
                </Select>
                <Select name="speedUnits" label="Speed units">
                    <option
                        value="kilometers-per-hour"
                        selected={
                            props.options.speedUnits === "kilometers-per-hour"
                        }
                    >
                        Kilometers per hour (km/h)
                    </option>
                    <option
                        value="meters-per-second"
                        selected={
                            props.options.speedUnits === "meters-per-second"
                        }
                    >
                        Meters per second (m/s)
                    </option>
                    <option
                        value="miles-per-hour"
                        selected={props.options.speedUnits === "miles-per-hour"}
                    >
                        Miles per hour (mph)
                    </option>
                </Select>
            </div>
        </section>
    );
}

function DateTimeSection(props: { options: UserOptions }) {
    return (
        <section className="space-y-5 border-t border-slate-200 pt-8 dark:border-slate-800">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Date and time
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Choose how dates and UTC timestamps are displayed.
                </p>
            </div>
            <Select name="dateTimeFormat" label="Date and time format">
                <option
                    value="finnish"
                    selected={props.options.dateTimeFormat === "finnish"}
                >
                    Finnish (14.7.2026 klo 16.05.30)
                </option>
                <option
                    value="european"
                    selected={props.options.dateTimeFormat === "european"}
                >
                    European (14/07/2026, 16:05:30)
                </option>
                <option
                    value="american"
                    selected={props.options.dateTimeFormat === "american"}
                >
                    American (07/14/2026, 4:05:30 PM)
                </option>
                <option
                    value="iso"
                    selected={props.options.dateTimeFormat === "iso"}
                >
                    ISO (2026-07-14 16:05:30 UTC)
                </option>
            </Select>
        </section>
    );
}

function JumpFromImageSection(props: { options: UserOptions }) {
    return (
        <section className="space-y-5 border-t border-slate-200 pt-8 dark:border-slate-800">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Jump from image
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
                value={props.options.openaiApiKey}
            />
            <Select name="jumpImageModel" label="Default AI model">
                {JUMP_IMAGE_MODELS.map((model) => (
                    <option
                        value={model.id}
                        selected={
                            model.id ===
                            (props.options.jumpImageModel ||
                                DEFAULT_JUMP_IMAGE_MODEL)
                        }
                    >
                        {model.label} — {model.description}
                    </option>
                ))}
            </Select>
            <Textarea
                name="jumpImagePrompt"
                label="Image reading prompt"
                rows={8}
                value={
                    props.options.jumpImagePrompt || DEFAULT_JUMP_IMAGE_PROMPT
                }
            />
        </section>
    );
}

function InstallAppSection() {
    const buttonId = useId();
    const statusId = useId();
    const hintId = useId();
    return (
        <section className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Install app
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Add Loki to your home screen for quick access.
                </p>
                <p
                    id={hintId}
                    hidden
                    className="mt-2 text-sm text-amber-600 dark:text-amber-400"
                ></p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <Button id={buttonId} type="button" variant="primary" hidden>
                    Install
                </Button>
                <p
                    id={statusId}
                    className="text-sm text-slate-500 dark:text-slate-400"
                ></p>
            </div>
            <Script
                $deps={[$assertElement, $showAndroidChromeHint]}
                $args={[buttonId, statusId, hintId]}
                $exec={(buttonId: string, statusId: string, hintId: string) => {
                    const buttonEl = document.getElementById(buttonId);
                    $assertElement(buttonEl, HTMLButtonElement);
                    const button: HTMLButtonElement = buttonEl;
                    const statusEl = document.getElementById(statusId);
                    $assertElement(statusEl, HTMLElement);
                    const status: HTMLElement = statusEl;
                    const hintEl = document.getElementById(hintId);
                    $assertElement(hintEl, HTMLParagraphElement);
                    const hint: HTMLParagraphElement = hintEl;
                    $showAndroidChromeHint(hint);

                    type BeforeInstallPromptEvent = Event & {
                        prompt: () => Promise<void>;
                        userChoice: Promise<{
                            outcome: "accepted" | "dismissed";
                        }>;
                    };

                    let deferredPrompt: BeforeInstallPromptEvent | null = null;

                    function isBeforeInstallPromptEvent(
                        event: Event,
                    ): event is BeforeInstallPromptEvent {
                        if (!("prompt" in event) || !("userChoice" in event)) {
                            return false;
                        }
                        const candidate: {
                            prompt?: unknown;
                            userChoice?: unknown;
                        } = event;
                        return typeof candidate.prompt === "function";
                    }

                    function isStandalone() {
                        return (
                            window.matchMedia("(display-mode: standalone)")
                                .matches ||
                            Boolean(
                                // iOS Safari
                                Reflect.get(navigator, "standalone"),
                            )
                        );
                    }

                    function setStatus(message: string) {
                        status.textContent = message;
                    }

                    function showInstallButton() {
                        button.hidden = false;
                        setStatus("");
                    }

                    function hideInstallButton() {
                        button.hidden = true;
                    }

                    if (isStandalone()) {
                        hideInstallButton();
                        setStatus("App is already installed.");
                        return;
                    }

                    window.addEventListener("beforeinstallprompt", (event) => {
                        event.preventDefault();
                        if (isBeforeInstallPromptEvent(event)) {
                            deferredPrompt = event;
                            showInstallButton();
                        }
                    });

                    window.addEventListener("appinstalled", () => {
                        deferredPrompt = null;
                        hideInstallButton();
                        setStatus("App installed.");
                    });

                    button.addEventListener("click", async () => {
                        if (!deferredPrompt) {
                            return;
                        }
                        await deferredPrompt.prompt();
                        const choice = await deferredPrompt.userChoice;
                        deferredPrompt = null;
                        hideInstallButton();
                        if (choice.outcome === "accepted") {
                            setStatus("App installed.");
                        } else {
                            setStatus(
                                "Install dismissed. You can try again later.",
                            );
                        }
                    });

                    // Safari / browsers without beforeinstallprompt
                    setTimeout(() => {
                        if (!deferredPrompt && !isStandalone()) {
                            setStatus(
                                "Use your browser’s “Add to Home Screen” option to install.",
                            );
                        }
                    }, 500);
                }}
            />
        </section>
    );
}

function PasswordSection() {
    return (
        <section className="space-y-5 border-t border-slate-200 pt-8 dark:border-slate-800">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Password
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Leave these fields empty to keep your current password.
                </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
                <Password
                    name="password"
                    label="New password"
                    placeholder="Choose a new password"
                />
                <Password
                    name="confirmPassword"
                    label="Confirm new password"
                    placeholder="Enter the new password again"
                />
            </div>
        </section>
    );
}

function PreferencesForm(props: {
    values: PreferencesFormValues;
    errors?: string[];
}) {
    return (
        <form
            method="post"
            data-confirm="Edit Preferences"
            className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
            <ErrorList
                errors={props.errors ?? []}
                className="border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
            />
            <section className="space-y-5">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Profile
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Update the details associated with your account.
                    </p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                    <Input
                        name="displayName"
                        label="Display name"
                        value={props.values.displayName}
                    />
                    <Input
                        name="email"
                        label="Email"
                        type="email"
                        required
                        value={props.values.email}
                    />
                </div>
            </section>
            <JumpHistorySection options={props.values.options} />
            <UnitsSection options={props.values.options} />
            <DateTimeSection options={props.values.options} />
            <JumpFromImageSection options={props.values.options} />
            <PasswordSection />
            <FormActions
                submitLabel="Save preferences"
                cancelHref={routes.logbook.index({})}
            />
        </form>
    );
}

function getFormValues(c: AppRequestContext): PreferencesFormValues {
    const user = getAppContext(c).getUser();
    return {
        displayName: user.displayName ?? "",
        email: user.email,
        options: user.options,
    };
}

function getFormDataValues(formData: FormData): Record<string, string> {
    const values: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (typeof value === "string") {
            values[key] = value;
        }
    }
    return values;
}

function optionsFromRawForm(
    raw: Record<string, string>,
    current: UserOptions,
): UserOptions {
    const partial = UserOptionsSchema.safeParse({
        altitudeUnits: raw.altitudeUnits ?? current.altitudeUnits,
        speedUnits: raw.speedUnits ?? current.speedUnits,
        dateTimeFormat: raw.dateTimeFormat ?? current.dateTimeFormat,
        previousJumpCount: raw.previousJumpCount ?? current.previousJumpCount,
        openaiApiKey: raw.openaiApiKey ?? current.openaiApiKey,
        jumpImagePrompt: raw.jumpImagePrompt ?? current.jumpImagePrompt,
        jumpImageModel: raw.jumpImageModel ?? current.jumpImageModel,
    });
    return partial.success ? partial.data : current;
}

function DeleteAccountSection() {
    return (
        <DangerZone>
            <p className="mb-3 text-sm text-red-700/90 dark:text-red-300/90">
                Permanently delete your account and all logbook data. This
                cannot be undone.
            </p>
            <ConfirmDeleteButton label="Delete account" />
        </DangerZone>
    );
}

function renderPreferences(
    c: AppRequestContext,
    values = getFormValues(c),
    errors?: string[],
) {
    return c.render(
        <LogbookPage title="Preferences">
            <PreferencesForm values={values} errors={errors} />
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <InstallAppSection />
            </div>
            <DeleteAccountSection />
        </LogbookPage>,
    );
}

function renderPreferencesPage(c: AppRequestContext) {
    return renderPreferences(c);
}

function getErrorMessages(result: { error: z.ZodError }): string[] {
    return result.error.issues.map((issue) => issue.message);
}

const DELETED_ACCOUNT_AI_USAGE_TITLE = "Deleted account";

async function handleDeleteAccount(c: AppRequestContext) {
    const ctx = getAppContext(c);
    const user = ctx.getUser();
    // Scrub AI usage titles before delete. ai_usage keeps rows (ON DELETE SET NULL);
    // jumps, gear, jump types, locations, aircrafts, and sessions cascade-delete.
    await ctx.db
        .update(aiUsage)
        .set({ title: DELETED_ACCOUNT_AI_USAGE_TITLE })
        .where(eq(aiUsage.userUuid, user.uuid));
    await ctx.db.delete(users).where(eq(users.uuid, user.uuid));
    await destroySession(c);
    return c.redirect(routes.auth.login({}));
}

async function handlePreferences(c: AppRequestContext) {
    const formData = await c.req.formData();
    if (formData.get("action") === "delete") {
        return handleDeleteAccount(c);
    }

    const raw = getFormDataValues(formData);
    const result = PreferencesSchema.safeParse(raw);
    const values = getFormValues(c);
    values.displayName = raw.displayName ?? values.displayName;
    values.email = raw.email ?? values.email;
    values.options = optionsFromRawForm(raw, values.options);

    if (!result.success) {
        return renderPreferences(c, values, getErrorMessages(result));
    }

    const ctx = getAppContext(c);
    const user = ctx.getUser();
    const existingEmail = await ctx.db
        .select({ uuid: users.uuid })
        .from(users)
        .where(
            and(eq(users.email, result.data.email), ne(users.uuid, user.uuid)),
        )
        .limit(1)
        .get();
    if (existingEmail) {
        return renderPreferences(c, values, [
            "Email address is already in use",
        ]);
    }

    const options = UserOptionsSchema.parse({
        altitudeUnits: result.data.altitudeUnits,
        speedUnits: result.data.speedUnits,
        dateTimeFormat: result.data.dateTimeFormat,
        previousJumpCount: result.data.previousJumpCount,
        openaiApiKey: result.data.openaiApiKey.trim(),
        jumpImagePrompt:
            result.data.jumpImagePrompt.trim() || DEFAULT_JUMP_IMAGE_PROMPT,
        jumpImageModel: result.data.jumpImageModel,
    });
    values.options = options;
    await ctx.db
        .update(users)
        .set({
            displayName: result.data.displayName || null,
            email: result.data.email,
            options: JSON.stringify(options),
            ...(result.data.password
                ? { password: await hashPassword(result.data.password) }
                : {}),
        })
        .where(eq(users.uuid, user.uuid));

    return c.redirect(routes.logbook.index({}));
}

export function register(app: App) {
    app.get(routes.preferences.route, renderPreferencesPage);
    app.post(routes.preferences.route, handlePreferences);
}
