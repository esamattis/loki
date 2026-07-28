import { registerRoute } from "@/core/register-route";
import { eq, sql } from "drizzle-orm";
import {
    getRequestContext,
    useRequestContext,
    type AppRouter,
    type HonoRequestContext,
} from "@/core/create-app";
import { useCoreLayoutUi } from "@/core/core-layout-context";
import { users } from "@/core/schema";
import { z } from "zod";
import { AuthFormShell } from "@/core/components/auth";
import { hashPassword } from "@/core/auth";
import { Password, TextInput } from "@/core/route-handlers/auth/components";
import { createSession } from "@/core/route-handlers/auth/sessions";
import * as routes from "@/core/routes";
import {
    compensateRegistration,
    createRegistrationUser,
} from "@/core/route-handlers/auth/register/user";
import { CoreUserOptionsSchema } from "@/core/options";
import { RegistrationLocaleInputs } from "@/core/route-handlers/auth/register/locale-inputs";
import { Link } from "@/core/components/link";
import {
    accountIdentityError,
    uniqueAccountField,
} from "@/core/account-uniqueness";

const RegisterFormSchema = z
    .object({
        invitationCode: z.string().optional(),
        username: z
            .string()
            .min(1, "Username is required")
            .refine((username) => !username.includes(":"), {
                message: "Username cannot contain a colon",
            }),
        displayName: z.string().optional(),
        email: z
            .string()
            .min(1, "Email is required")
            .email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        confirmPassword: z.string().min(1, "Confirm password"),
        dateTimeFormat: CoreUserOptionsSchema.shape.dateTimeFormat,
        numberFormat: CoreUserOptionsSchema.shape.numberFormat,
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

function RegisterForm(props: {
    errors?: string[];
    invitationRequired: boolean;
    invitationCode?: string;
    username?: string;
    displayName?: string;
    email?: string;
}) {
    const selfHosted = useRequestContext().isSelfHosted();

    return (
        <AuthFormShell
            title="Create account"
            errors={props.errors ?? []}
            submitLabel="Create account"
            alternateHref={routes.auth.login({})}
            alternateLabel="← Already have an account? Log in"
        >
            {!props.invitationRequired && (
                <section className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-950 ring-1 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-100 dark:ring-indigo-800">
                    <h3 className="font-bold">First account: administrator</h3>
                    <p className="mt-1">
                        This first account can manage users, grant or remove
                        administrator access, create and manage invitations, and
                        sign in as another user.
                    </p>
                    <p className="mt-2 font-medium">
                        All later accounts are normal non-admin users and
                        require an invitation created by an administrator.
                    </p>
                </section>
            )}
            <RegistrationLocaleInputs />
            {useCoreLayoutUi().registrationFields}
            {!selfHosted && (
                <p>
                    Please read the{" "}
                    <Link href={routes.privacy({}, {})}>
                        Terms & Privacy Policy
                    </Link>{" "}
                    before creating an account.
                </p>
            )}
            {props.invitationRequired && (
                <TextInput
                    name="invitationCode"
                    label="Invitation code:"
                    placeholder="Enter invitation code"
                    required
                    autofocus
                    value={props.invitationCode}
                />
            )}
            <TextInput
                name="username"
                label="Username:"
                placeholder="Choose username"
                required
                autofocus={!props.invitationRequired}
                value={props.username}
            />
            <TextInput
                name="displayName"
                label="Display name:"
                placeholder="Example: John Doe"
                value={props.displayName}
            />
            <TextInput
                name="email"
                label="Email:"
                type="email"
                placeholder="Email address"
                required
                value={props.email}
            />
            <Password
                name="password"
                label="Password:"
                placeholder="Choose password"
                required
            />
            <Password
                name="confirmPassword"
                label="Confirm password:"
                placeholder="Enter password again"
                required
            />
        </AuthFormShell>
    );
}

async function renderRegisterForm(c: HonoRequestContext) {
    if (getRequestContext(c).user) {
        return c.redirect(getRequestContext(c).appOptions.authenticatedHome);
    }
    return c.render(
        <RegisterForm invitationRequired={await hasRegisteredUsers(c)} />,
    );
}

async function hasRegisteredUsers(c: HonoRequestContext): Promise<boolean> {
    const user = await getRequestContext(c)
        .db.select({ uuid: users.uuid })
        .from(users)
        .where(
            sql`coalesce(json_extract(${users.options}, '$.readonly'), 0) = 0`,
        )
        .limit(1)
        .get();
    return Boolean(user);
}

function formDataToStrings(formData: FormData): Record<string, string> {
    const values: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (typeof value === "string") values[key] = value;
    }
    return values;
}

function registerFormProps(raw: {
    invitationCode?: string;
    username?: string;
    displayName?: string;
    email?: string;
}) {
    return {
        invitationCode: raw.invitationCode,
        username: raw.username,
        displayName: raw.displayName,
        email: raw.email,
    };
}

async function handleRegister(c: HonoRequestContext) {
    const raw = formDataToStrings(await c.req.formData());
    const result = RegisterFormSchema.safeParse(raw);
    const invitationRequired = await hasRegisteredUsers(c);
    if (!result.success)
        return c.render(
            <RegisterForm
                errors={result.error.issues.map((issue) => issue.message)}
                invitationRequired={invitationRequired}
                {...registerFormProps(raw)}
            />,
        );

    const {
        invitationCode,
        username,
        displayName,
        email,
        password,
        dateTimeFormat,
        numberFormat,
    } = result.data;
    const db = getRequestContext(c).db;
    const formProps = registerFormProps({
        invitationCode,
        username,
        displayName,
        email,
    });
    if (invitationRequired && !invitationCode)
        return c.render(
            <RegisterForm
                errors={["Invitation code is required"]}
                invitationRequired
                {...formProps}
            />,
        );

    const existingByUsername = await db
        .select({ uuid: users.uuid })
        .from(users)
        .where(eq(users.username, username))
        .limit(1)
        .get();
    if (existingByUsername)
        return c.render(
            <RegisterForm
                errors={["Username is already in use"]}
                invitationRequired={invitationRequired}
                {...formProps}
            />,
        );
    const existingByEmail = await db
        .select({ uuid: users.uuid })
        .from(users)
        .where(eq(users.email, email))
        .limit(1)
        .get();
    if (existingByEmail)
        return c.render(
            <RegisterForm
                errors={["Email address is already in use"]}
                invitationRequired={invitationRequired}
                {...formProps}
            />,
        );

    const passwordHash = await hashPassword(password);
    let createdUser;
    try {
        createdUser = await createRegistrationUser(
            db,
            {
                username,
                displayName,
                email,
                passwordHash,
                options: CoreUserOptionsSchema.parse({
                    dateTimeFormat,
                    numberFormat,
                }),
            },
            invitationCode,
        );
    } catch (error) {
        const duplicateField = uniqueAccountField(error);
        if (!duplicateField) throw error;
        return c.render(
            <RegisterForm
                errors={[accountIdentityError(duplicateField)]}
                invitationRequired={invitationRequired}
                {...formProps}
            />,
        );
    }
    if ("error" in createdUser)
        return c.render(
            <RegisterForm
                errors={[createdUser.error]}
                invitationRequired
                {...formProps}
            />,
        );

    const newUserUuid = createdUser.uuid;
    const coreFields = new Set([
        "invitationCode",
        "username",
        "displayName",
        "email",
        "password",
        "confirmPassword",
        "dateTimeFormat",
        "numberFormat",
    ]);
    const appFormValues = Object.freeze(
        Object.fromEntries(
            Object.entries(raw).filter(([name]) => !coreFields.has(name)),
        ),
    );
    const appOptions = getRequestContext(c).appOptions;
    if (appOptions.afterUserCreated) {
        try {
            await appOptions.afterUserCreated(
                getRequestContext(c),
                newUserUuid,
                appFormValues,
            );
        } catch (error) {
            try {
                await compensateRegistration(db, {
                    userUuid: newUserUuid,
                    invitationCode,
                    consumedInvitation: createdUser.consumedInvitation,
                });
            } catch (compensationError) {
                throw new AggregateError(
                    [error, compensationError],
                    "User initialization and compensation failed",
                );
            }
            throw error;
        }
    }
    await createSession(c, newUserUuid);
    return c.redirect(appOptions.authenticatedHome);
}

export function register(app: AppRouter) {
    registerRoute(app, "get", routes.auth.register, renderRegisterForm);
    registerRoute(app, "post", routes.auth.register, handleRegister);
}
