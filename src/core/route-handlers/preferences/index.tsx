import { registerRoute } from "@/core/register-route";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { useId } from "hono/jsx";
import {
    getAppContext,
    useAppContext,
    type App,
    type AppRequestContext,
} from "@/core/create-app";
import { useCoreLayoutUi } from "@/core/core-layout-context";
import { AppPage } from "@/core/app-page";
import { hashPassword } from "@/core/auth";
import {
    accountIdentityError,
    uniqueAccountField,
} from "@/core/account-uniqueness";
import { deleteAccount } from "@/core/delete-account";
import { CoreUserOptionsSchema } from "@/core/options";
import { users } from "@/core/schema";
import { Button, Checkbox, Input, Select } from "@/core/components/form";
import { ErrorList } from "@/core/components/feedback";
import { RedirectBackAfterPost } from "@/core/components/return-after-form-post";
import { Password } from "@/core/route-handlers/auth/components";
import { DangerZone } from "@/core/components/ui/danger-zone";
import { ConfirmDangerButton } from "@/core/components/ui/confirm-danger-button";
import * as routes from "@/core/routes";

const PreferencesSchema = z
    .object({
        username: z
            .string()
            .min(1, "Username is required")
            .refine(
                (value) => !value.includes(":"),
                "Username cannot contain a colon",
            ),
        displayName: z.string(),
        email: z.string().email("Invalid email address"),
        password: z.string(),
        confirmPassword: z.string(),
        dateTimeFormat: CoreUserOptionsSchema.shape.dateTimeFormat,
        numberFormat: CoreUserOptionsSchema.shape.numberFormat,
        htmlCacheEnabled: z.literal("true").optional(),
    })
    .superRefine((value, context) => {
        if (!value.password && !value.confirmPassword) return;
        if (value.password.length < 6)
            context.addIssue({
                code: "custom",
                message: "Password must be at least 6 characters",
                path: ["password"],
            });
        if (value.password !== value.confirmPassword)
            context.addIssue({
                code: "custom",
                message: "Passwords do not match",
                path: ["confirmPassword"],
            });
    });

function CorePreferencesForm(props: {
    formId: string;
    errors?: string[];
    values?: Record<string, string>;
}) {
    const context = useAppContext();
    const user = context.getUser();
    return (
        <form
            id={props.formId}
            method="post"
            action={routes.preferences({})}
            data-loki-confirm="Edit Preferences"
            className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
            <RedirectBackAfterPost />
            <ErrorList errors={props.errors ?? []} />
            <section className="grid gap-5 sm:grid-cols-2">
                <Input
                    name="username"
                    label="Username"
                    required
                    value={props.values?.username ?? user.username}
                />
                <Input
                    name="displayName"
                    label="Display name"
                    value={props.values?.displayName ?? user.displayName ?? ""}
                />
                <Input
                    name="email"
                    label="Email"
                    type="email"
                    required
                    value={props.values?.email ?? user.email}
                />
            </section>
            <section className="grid gap-5 sm:grid-cols-2">
                <Select name="dateTimeFormat" label="Date and time format">
                    {(["finnish", "european", "american", "iso"] as const).map(
                        (value) => (
                            <option
                                value={value}
                                selected={
                                    (props.values?.dateTimeFormat ??
                                        user.options.dateTimeFormat) === value
                                }
                            >
                                {value}
                            </option>
                        ),
                    )}
                </Select>
                <Select name="numberFormat" label="Number format">
                    {(
                        ["space-comma", "period-comma", "comma-period"] as const
                    ).map((value) => (
                        <option
                            value={value}
                            selected={
                                (props.values?.numberFormat ??
                                    user.options.numberFormat) === value
                            }
                        >
                            {value}
                        </option>
                    ))}
                </Select>
            </section>
            <section className="grid gap-5 sm:grid-cols-2">
                <Password name="password" label="New password" />
                <Password name="confirmPassword" label="Confirm new password" />
            </section>
            {!context.isSelfHosted() && (
                <Checkbox
                    name="htmlCacheEnabled"
                    value="true"
                    label="Enable page caching"
                    checked={user.options.htmlCacheEnabled}
                />
            )}
            <Button type="submit" variant="primary">
                Save preferences
            </Button>
        </form>
    );
}

export function PreferencesPage(props: {
    errors?: string[];
    appContent?: any;
    values?: Record<string, string>;
}) {
    const formId = useId();
    return (
        <AppPage
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
            <CorePreferencesForm
                formId={formId}
                errors={props.errors}
                values={props.values}
            />
            {props.appContent ?? useCoreLayoutUi().preferencesContent}
            <form method="post" action={routes.preferences({})}>
                <DangerZone>
                    <ConfirmDangerButton
                        name="action"
                        value="delete"
                        label="Delete account"
                        confirmLabel="Confirm delete"
                    />
                </DangerZone>
            </form>
        </AppPage>
    );
}

function render(
    c: AppRequestContext,
    errors?: string[],
    values?: Record<string, string>,
) {
    return c.render(<PreferencesPage errors={errors} values={values} />);
}

async function handle(c: AppRequestContext) {
    const form = await c.req.formData();
    if (form.get("action") === "delete") {
        await deleteAccount(c);
        return c.redirect(routes.auth.login({}));
    }
    const raw = Object.fromEntries(form.entries());
    const values = Object.fromEntries(
        Object.entries(raw).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
    );
    const result = PreferencesSchema.safeParse(raw);
    if (!result.success)
        return render(
            c,
            result.error.issues.map((issue) => issue.message),
            values,
        );
    const context = getAppContext(c);
    const user = context.getUser();
    const duplicate = await context.db
        .select({ uuid: users.uuid })
        .from(users)
        .where(
            and(
                ne(users.uuid, user.uuid),
                eq(users.username, result.data.username),
            ),
        )
        .get();
    if (duplicate) return render(c, ["Username is already in use"], values);
    try {
        await context.db
            .update(users)
            .set({
                username: result.data.username,
                displayName: result.data.displayName || null,
                email: result.data.email,
                ...(result.data.password
                    ? { password: await hashPassword(result.data.password) }
                    : {}),
            })
            .where(eq(users.uuid, user.uuid));
        await user.updateCoreOptions({
            dateTimeFormat: result.data.dateTimeFormat,
            numberFormat: result.data.numberFormat,
            htmlCacheEnabled: context.isSelfHosted()
                ? user.options.htmlCacheEnabled
                : result.data.htmlCacheEnabled === "true",
        });
    } catch (error) {
        const field = uniqueAccountField(error);
        if (!field) throw error;
        return render(c, [accountIdentityError(field)], values);
    }
    return c.redirect(context.appOptions.authenticatedHome);
}

export function register(app: App) {
    registerRoute(app, "get", routes.preferences, (c) => render(c));
    registerRoute(app, "post", routes.preferences, handle);
}
