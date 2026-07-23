import { and, eq, ne } from "drizzle-orm";
import { useId } from "hono/jsx";
import { z } from "zod";
import {
    getAppContext,
    type App,
    type AppRequestContext,
    useAppContext,
} from "@/app/app";
import { Button, Checkbox, Input, Select, Textarea } from "@/components/form";
import { ErrorList } from "@/components/feedback";
import { Script } from "@/components/script";
import { RedirectBackAfterPost } from "@/components/return-after-form-post";
import { hashPassword } from "@/auth";
import { Password } from "@/route-handlers/auth/components";
import { DEFAULT_JUMP_IMAGE_PROMPT } from "@/jump-image";
import { UserOptionsSchema, type UserOptions } from "@/options";
import * as routes from "@/routes";
import { aircrafts, gear, jumps, jumpTypes, locations, users } from "@/schema";
import { LogbookPage } from "@/app/logbook-page";
import { $select } from "@/utils";
import { DangerZoneSection } from "@/route-handlers/preferences/danger-zone";
import { deleteAccount } from "@/delete-account";
import { accountIdentityError, uniqueAccountField } from "@/account-uniqueness";

const PreferencesSchema = z
    .object({
        username: z
            .string()
            .min(1, "Username is required")
            .refine((username) => !username.includes(":"), {
                message: "Username cannot contain a colon",
            }),
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
        numberFormat: UserOptionsSchema.shape.numberFormat,
        openaiApiKey: z.string(),
        jumpImagePrompt: z.string(),
        htmlCacheEnabled: z.literal("true").optional(),
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
    username: string;
    displayName: string;
    email: string;
    options: UserOptions;
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
                    Formatting
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Choose how dates, UTC timestamps, and numbers are displayed.
                </p>
            </div>
            <Select name="dateTimeFormat" label="Date and time format">
                <option
                    value="finnish"
                    selected={props.options.dateTimeFormat === "finnish"}
                >
                    Day.month.year, 24-hour (14.7.2026 klo 16.05.30)
                </option>
                <option
                    value="european"
                    selected={props.options.dateTimeFormat === "european"}
                >
                    Day/month/year, 24-hour (14/07/2026, 16:05:30)
                </option>
                <option
                    value="american"
                    selected={props.options.dateTimeFormat === "american"}
                >
                    Month/day/year, 12-hour (07/14/2026, 4:05:30 PM)
                </option>
                <option
                    value="iso"
                    selected={props.options.dateTimeFormat === "iso"}
                >
                    Year-month-day, 24-hour (2026-07-14 16:05:30 UTC)
                </option>
            </Select>
            <Select name="numberFormat" label="Number format">
                <option
                    value="space-comma"
                    selected={props.options.numberFormat === "space-comma"}
                >
                    Space and comma (12 345,67)
                </option>
                <option
                    value="period-comma"
                    selected={props.options.numberFormat === "period-comma"}
                >
                    Period and comma (12.345,67)
                </option>
                <option
                    value="comma-period"
                    selected={props.options.numberFormat === "comma-period"}
                >
                    Comma and period (12,345.67)
                </option>
            </Select>
        </section>
    );
}

function PerformanceSection(props: { options: UserOptions }) {
    return (
        <section className="space-y-5 border-t border-slate-200 pt-8 dark:border-slate-800">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Performance
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Cache generated pages securely for faster navigation. The
                    cache is cleared whenever you submit a form.
                </p>
            </div>
            <Checkbox
                name="htmlCacheEnabled"
                value="true"
                label="Enable page caching"
                checked={props.options.htmlCacheEnabled}
            />
        </section>
    );
}

function JumpFromImageSection(props: { options: UserOptions }) {
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
                value={props.options.openaiApiKey}
            />
            <div id="jump-image-prompt" className="scroll-mt-4">
                <div id={promptContainerId}>
                    <Textarea
                        name="jumpImagePrompt"
                        label="Image reading prompt"
                        rows={14}
                        value={
                            props.options.jumpImagePrompt ||
                            DEFAULT_JUMP_IMAGE_PROMPT
                        }
                    />
                    <Button
                        id={restorePromptButtonId}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mt-2"
                    >
                        Restore default prompt
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
    formId: string;
    values: PreferencesFormValues;
    errors?: string[];
}) {
    const selfHosted = useAppContext().isSelfHosted();
    return (
        <form
            id={props.formId}
            method="post"
            action={routes.preferences({})}
            data-loki-confirm="Edit Preferences"
            className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
            <RedirectBackAfterPost />
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
                        name="username"
                        label="Username"
                        required
                        value={props.values.username}
                    />
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
            <UnitsSection options={props.values.options} />
            <DateTimeSection options={props.values.options} />
            <JumpFromImageSection options={props.values.options} />
            <PasswordSection />
            {!selfHosted && (
                <PerformanceSection options={props.values.options} />
            )}
            <div className="hidden sm:block">
                <Button type="submit" variant="primary">
                    Save preferences
                </Button>
            </div>
        </form>
    );
}

function PreferencesPage(props: {
    values: PreferencesFormValues;
    errors?: string[];
}) {
    const formId = useId();

    return (
        <LogbookPage
            title="Preferences"
            mobileAction={
                <Button
                    type="submit"
                    form={formId}
                    variant="primary"
                    className="w-full"
                >
                    Save preferences
                </Button>
            }
        >
            <PreferencesForm
                formId={formId}
                values={props.values}
                errors={props.errors}
            />
            <DangerZoneSection />
        </LogbookPage>
    );
}

function getFormValues(c: AppRequestContext): PreferencesFormValues {
    const user = getAppContext(c).getUser();
    return {
        username: user.username,
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
    selfHosted: boolean,
): UserOptions {
    const partial = UserOptionsSchema.safeParse({
        altitudeUnits: raw.altitudeUnits ?? current.altitudeUnits,
        speedUnits: raw.speedUnits ?? current.speedUnits,
        dateTimeFormat: raw.dateTimeFormat ?? current.dateTimeFormat,
        numberFormat: raw.numberFormat ?? current.numberFormat,
        openaiApiKey: raw.openaiApiKey ?? current.openaiApiKey,
        jumpImagePrompt: raw.jumpImagePrompt ?? current.jumpImagePrompt,
        jumpImageModel: current.jumpImageModel,
        jumpImageAdditionalContext: current.jumpImageAdditionalContext,
        htmlCacheEnabled: selfHosted
            ? current.htmlCacheEnabled
            : raw.htmlCacheEnabled === "true",
        privacyPolicyAccepted: current.privacyPolicyAccepted,
        readonly: current.readonly,
        exampleDataChecksum: current.exampleDataChecksum,
        lastCsvExportAt: current.lastCsvExportAt,
    });
    return partial.success ? partial.data : current;
}

function renderPreferences(
    c: AppRequestContext,
    values = getFormValues(c),
    errors?: string[],
) {
    return c.render(<PreferencesPage values={values} errors={errors} />);
}

function renderPreferencesPage(c: AppRequestContext) {
    return renderPreferences(c);
}

function getErrorMessages(result: { error: z.ZodError }): string[] {
    return result.error.issues.map((issue) => issue.message);
}

async function handleDeleteAccount(c: AppRequestContext) {
    await deleteAccount(c);
    return c.redirect(routes.auth.login({}));
}

async function handleDeleteLogbookData(c: AppRequestContext) {
    const ctx = getAppContext(c);
    const userUuid = ctx.getUser().uuid;
    await ctx.db.delete(jumps).where(eq(jumps.userUuid, userUuid));
    await ctx.db.delete(gear).where(eq(gear.userUuid, userUuid));
    await ctx.db.delete(jumpTypes).where(eq(jumpTypes.userUuid, userUuid));
    await ctx.db.delete(aircrafts).where(eq(aircrafts.userUuid, userUuid));
    await ctx.db.delete(locations).where(eq(locations.userUuid, userUuid));
    return c.redirect(routes.logbook.index({}));
}

async function handlePreferences(c: AppRequestContext) {
    const formData = await c.req.formData();
    if (formData.get("action") === "delete") {
        return handleDeleteAccount(c);
    }
    if (formData.get("action") === "delete-logbook-data") {
        return handleDeleteLogbookData(c);
    }

    const raw = getFormDataValues(formData);
    const result = PreferencesSchema.safeParse(raw);
    const ctx = getAppContext(c);
    const values = getFormValues(c);
    values.username = raw.username ?? values.username;
    values.displayName = raw.displayName ?? values.displayName;
    values.email = raw.email ?? values.email;
    values.options = optionsFromRawForm(
        raw,
        values.options,
        ctx.isSelfHosted(),
    );

    if (!result.success) {
        return renderPreferences(c, values, getErrorMessages(result));
    }

    const user = ctx.getUser();
    const existingUsername = await ctx.db
        .select({ uuid: users.uuid })
        .from(users)
        .where(
            and(
                eq(users.username, result.data.username),
                ne(users.uuid, user.uuid),
            ),
        )
        .limit(1)
        .get();
    if (existingUsername) {
        return renderPreferences(c, values, ["Username is already in use"]);
    }
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
        numberFormat: result.data.numberFormat,
        openaiApiKey: result.data.openaiApiKey.trim(),
        jumpImagePrompt:
            result.data.jumpImagePrompt.trim() || DEFAULT_JUMP_IMAGE_PROMPT,
        jumpImageModel: user.options.jumpImageModel,
        jumpImageAdditionalContext: user.options.jumpImageAdditionalContext,
        htmlCacheEnabled: ctx.isSelfHosted()
            ? user.options.htmlCacheEnabled
            : result.data.htmlCacheEnabled === "true",
        privacyPolicyAccepted: user.options.privacyPolicyAccepted,
        readonly: user.options.readonly,
        exampleDataChecksum: user.options.exampleDataChecksum,
        lastCsvExportAt: user.options.lastCsvExportAt,
    });
    values.options = options;
    try {
        await ctx.db
            .update(users)
            .set({
                username: result.data.username,
                displayName: result.data.displayName || null,
                email: result.data.email,
                options: JSON.stringify(options),
                ...(result.data.password
                    ? { password: await hashPassword(result.data.password) }
                    : {}),
            })
            .where(eq(users.uuid, user.uuid));
    } catch (error) {
        const duplicateField = uniqueAccountField(error);
        if (!duplicateField) throw error;
        return renderPreferences(c, values, [
            accountIdentityError(duplicateField),
        ]);
    }

    return c.redirect(routes.logbook.index({}));
}

export function register(app: App) {
    app.get(routes.preferences.route, renderPreferencesPage);
    app.post(routes.preferences.route, handlePreferences);
}
