import { and, eq, ne } from "drizzle-orm";
import { z } from "zod/v4";
import { app, getAppContext, type AppRequestContext } from "./app";
import { Input, NumberInput, Select, FormActions } from "./components/form";
import { ErrorList } from "./components/feedback";
import { hashPassword, Password } from "./login";
import { UserOptionsSchema, type UserOptions } from "./options";
import * as routes from "./routes";
import { users } from "./schema";
import { LogbookPage } from "./logbook/layout";

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
        previousJumpCount: UserOptionsSchema.shape.previousJumpCount,
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

function PreferencesForm(props: {
    values: PreferencesFormValues;
    errors?: string[];
}) {
    return (
        <form
            method="post"
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
            <section className="space-y-5 border-t border-slate-200 pt-8 dark:border-slate-800">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Units
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Choose how altitude and speed are displayed in your
                        logbook.
                    </p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                    <Select name="altitudeUnits" label="Altitude units">
                        <option
                            value="meters"
                            selected={
                                props.values.options.altitudeUnits === "meters"
                            }
                        >
                            Meters (m)
                        </option>
                        <option
                            value="feet"
                            selected={
                                props.values.options.altitudeUnits === "feet"
                            }
                        >
                            Feet (ft)
                        </option>
                    </Select>
                    <Select name="speedUnits" label="Speed units">
                        <option
                            value="kilometers-per-hour"
                            selected={
                                props.values.options.speedUnits ===
                                "kilometers-per-hour"
                            }
                        >
                            Kilometers per hour (km/h)
                        </option>
                        <option
                            value="meters-per-second"
                            selected={
                                props.values.options.speedUnits ===
                                "meters-per-second"
                            }
                        >
                            Meters per second (m/s)
                        </option>
                    </Select>
                </div>
            </section>
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
            <FormActions
                submitLabel="Save preferences"
                cancelHref={routes.logbook({})}
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

function renderPreferences(
    c: AppRequestContext,
    values = getFormValues(c),
    errors?: string[],
) {
    return c.render(
        <LogbookPage title="Preferences">
            <PreferencesForm values={values} errors={errors} />
        </LogbookPage>,
    );
}

function renderPreferencesPage(c: AppRequestContext) {
    return renderPreferences(c);
}

function getErrorMessages(result: { error: z.ZodError }): string[] {
    return result.error.issues.map((issue) => issue.message);
}

async function handlePreferences(c: AppRequestContext) {
    const raw = getFormDataValues(await c.req.formData());
    const result = PreferencesSchema.safeParse(raw);
    const values = getFormValues(c);
    values.displayName = raw.displayName ?? values.displayName;
    values.email = raw.email ?? values.email;

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
        previousJumpCount: result.data.previousJumpCount,
    });
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

    return c.redirect(routes.logbook({}));
}

app.get(routes.preferences.route, renderPreferencesPage);
app.post(routes.preferences.route, handlePreferences);
