import { registerRoute } from "@/core/register-route";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { useId } from "hono/jsx";
import {
    getRequestContext,
    useRequestContext,
    type AppRouter,
    type HonoRequestContext,
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
import { Button } from "@/core/components/form";
import { ErrorList } from "@/core/components/feedback";
import { RedirectBackAfterPost } from "@/core/components/return-after-form-post";
import { DangerZone } from "@/core/components/ui/danger-zone";
import { ConfirmDeleteButton } from "@/core/components/ui/confirm-delete-button";
import * as routes from "@/core/routes";
import { PreferencesFormProvider } from "@/core/route-handlers/preferences/form-context";
import {
    FormattingSection,
    PasswordSection,
    PerformanceSection,
    PreferencesSubmitButton,
    ProfileSection,
} from "@/core/route-handlers/preferences/form-sections";

const PreferencesSchema = z
    .object({
        username: z
            .string()
            .min(1, "Username is required")
            .refine(
                (value) => !value.includes(":"),
                "Username cannot contain a colon",
            ),
        displayName: z.string().trim(),
        email: z
            .string()
            .trim()
            .min(1, "Email is required")
            .email("Invalid email address"),
        password: z.string(),
        confirmPassword: z.string(),
        dateTimeFormat: CoreUserOptionsSchema.shape.dateTimeFormat,
        numberFormat: CoreUserOptionsSchema.shape.numberFormat,
        htmlCacheEnabled: z.literal("true").optional(),
    })
    .superRefine((value, context) => {
        const changingPassword =
            value.password.length > 0 || value.confirmPassword.length > 0;
        if (!changingPassword) return;
        if (value.password.length < 6)
            context.addIssue({
                code: "custom",
                message: "Password must be at least 6 characters",
                path: ["password"],
            });
        if (!value.confirmPassword)
            context.addIssue({
                code: "custom",
                message: "Confirm your new password",
                path: ["confirmPassword"],
            });
        else if (value.password !== value.confirmPassword)
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
    const context = useRequestContext();
    const layout = useCoreLayoutUi();
    return (
        <PreferencesFormProvider value={{ values: props.values }}>
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
                <ProfileSection />
                {layout.preferencesContent}
                <FormattingSection />
                {layout.preferencesAfterFormatting}
                <PasswordSection />
                {!context.isSelfHosted() && <PerformanceSection />}
                <PreferencesSubmitButton />
            </form>
        </PreferencesFormProvider>
    );
}

function AccountDangerZone() {
    const layout = useCoreLayoutUi();
    return (
        <div id="danger-zone" className="scroll-mt-4">
            <DangerZone>
                {layout.preferencesDangerContent}
                <div
                    className={
                        layout.preferencesDangerContent
                            ? "mt-5 space-y-3 border-t border-red-200 pt-5 dark:border-red-900/60"
                            : "space-y-3"
                    }
                >
                    <p className="text-sm text-red-700/90 dark:text-red-300/90">
                        Permanently delete your account and all logbook data.
                        This cannot be undone.
                    </p>
                    <ConfirmDeleteButton label="Delete account" />
                </div>
            </DangerZone>
        </div>
    );
}

export function PreferencesPage(props: {
    errors?: string[];
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
            <AccountDangerZone />
        </AppPage>
    );
}

function render(
    c: HonoRequestContext,
    errors?: string[],
    values?: Record<string, string>,
) {
    return c.render(<PreferencesPage errors={errors} values={values} />);
}

function formStringValues(form: FormData): Record<string, string> {
    return Object.fromEntries(
        [...form.entries()].filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
    );
}

async function handle(c: HonoRequestContext) {
    const form = await c.req.formData();
    if (form.get("action") === "delete") {
        await deleteAccount(c);
        return c.redirect(routes.auth.login({}));
    }
    const values = formStringValues(form);
    const result = PreferencesSchema.safeParse(values);
    const context = getRequestContext(c);
    const appErrors =
        context.appOptions.validatePreferencesForm?.(values) ?? [];
    if (!result.success || appErrors.length > 0)
        return render(
            c,
            [
                ...(result.success
                    ? []
                    : result.error.issues.map((issue) => issue.message)),
                ...appErrors,
            ],
            values,
        );
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
    const duplicateEmail = await context.db
        .select({ uuid: users.uuid })
        .from(users)
        .where(
            and(ne(users.uuid, user.uuid), eq(users.email, result.data.email)),
        )
        .get();
    if (duplicateEmail)
        return render(c, ["Email address is already in use"], values);
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
        await context.appOptions.savePreferencesForm?.(context, values);
    } catch (error) {
        const field = uniqueAccountField(error);
        if (!field) throw error;
        return render(c, [accountIdentityError(field)], values);
    }
    return c.redirect(context.appOptions.authenticatedHome);
}

export function register(app: AppRouter) {
    registerRoute(app, "get", routes.preferences, (c) => render(c));
    registerRoute(app, "post", routes.preferences, handle);
}
