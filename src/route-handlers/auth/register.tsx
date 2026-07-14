import { and, eq, gt, sql } from "drizzle-orm";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import { invitations, jumpTypes, users } from "@/schema";
import { z } from "zod";
import { AuthFormShell } from "@/components/auth";
import { hashPassword } from "@/auth";
import { Password, TextInput } from "@/route-handlers/auth/components";
import { createSession } from "@/route-handlers/auth/sessions";
import { DEFAULT_USER_OPTIONS_JSON } from "@/options";
import * as routes from "@/routes";

const DEFAULT_JUMP_TYPES = [
    "Cutaway",
    "FS",
    "Static Line",
    "Wingsuit",
    "Freefly",
    "AFF",
];

const RegisterFormSchema = z
    .object({
        invitationCode: z.string().min(1, "Invitation code is required"),
        username: z.string().min(1, "Username is required"),
        displayName: z.string().optional(),
        email: z
            .string()
            .min(1, "Email is required")
            .email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        confirmPassword: z.string().min(1, "Confirm password"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

function RegisterForm(props: {
    errors?: string[];
    invitationCode?: string;
    username?: string;
    displayName?: string;
    email?: string;
}) {
    return (
        <AuthFormShell
            title="Create account"
            errors={props.errors ?? []}
            submitLabel="Create account"
            alternateHref={routes.auth.login({})}
            alternateLabel="← Already have an account? Log in"
        >
            <TextInput
                name="invitationCode"
                label="Invitation code:"
                placeholder="Enter invitation code"
                required
                autofocus
                value={props.invitationCode}
            />
            <TextInput
                name="username"
                label="Username:"
                placeholder="Choose username"
                required
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

async function renderRegisterForm(c: AppRequestContext) {
    if (getAppContext(c).user) {
        return c.redirect(routes.logbook.index({}));
    }
    return c.render(<RegisterForm />);
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

async function handleRegister(c: AppRequestContext) {
    const raw = formDataToStrings(await c.req.formData());
    const result = RegisterFormSchema.safeParse(raw);
    if (!result.success)
        return c.render(
            <RegisterForm
                errors={result.error.issues.map((issue) => issue.message)}
                {...registerFormProps(raw)}
            />,
        );

    const { invitationCode, username, displayName, email, password } =
        result.data;
    const db = getAppContext(c).db;
    const formProps = registerFormProps({
        invitationCode,
        username,
        displayName,
        email,
    });
    const invitation = await db
        .select({ code: invitations.code, count: invitations.count })
        .from(invitations)
        .where(
            and(eq(invitations.code, invitationCode), gt(invitations.count, 0)),
        )
        .limit(1)
        .get();
    if (!invitation)
        return c.render(
            <RegisterForm
                errors={["Invalid or exhausted invitation code"]}
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
                {...formProps}
            />,
        );

    const passwordHash = await hashPassword(password);
    const consumed = await db
        .update(invitations)
        .set({ count: sql`${invitations.count} - 1` })
        .where(
            and(eq(invitations.code, invitationCode), gt(invitations.count, 0)),
        )
        .returning({ code: invitations.code })
        .get();
    if (!consumed)
        return c.render(
            <RegisterForm
                errors={["Invalid or exhausted invitation code"]}
                {...formProps}
            />,
        );

    await db
        .insert(users)
        .values({
            username,
            displayName: displayName || null,
            email,
            password: passwordHash,
            options: DEFAULT_USER_OPTIONS_JSON,
        })
        .run();
    const newUser = await db
        .select({ uuid: users.uuid })
        .from(users)
        .where(eq(users.username, username))
        .limit(1)
        .get();
    if (!newUser)
        return c.render(
            <RegisterForm
                errors={["User creation failed. Try again."]}
                {...formProps}
            />,
        );

    const existingJumpTypes = await db
        .select({ uuid: jumpTypes.uuid })
        .from(jumpTypes)
        .where(eq(jumpTypes.userUuid, newUser.uuid))
        .limit(1)
        .get();
    if (!existingJumpTypes) {
        await db
            .insert(jumpTypes)
            .values(
                DEFAULT_JUMP_TYPES.map((name) => ({
                    userUuid: newUser.uuid,
                    name,
                })),
            )
            .run();
    }
    await createSession(c, newUser.uuid);
    return c.redirect(routes.logbook.index({}));
}

export function register(app: App) {
    app.get(routes.auth.register.route, renderRegisterForm);
    app.post(routes.auth.register.route, handleRegister);
}
