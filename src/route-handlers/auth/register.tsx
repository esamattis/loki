import { eq } from "drizzle-orm";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import { aircrafts, jumpTypes, locations, users } from "@/schema";
import { z } from "zod";
import { AuthFormShell } from "@/components/auth";
import { hashPassword } from "@/auth";
import { Password, TextInput } from "@/route-handlers/auth/components";
import { createSession } from "@/route-handlers/auth/sessions";
import * as routes from "@/routes";
import { createRegistrationUser } from "@/route-handlers/auth/register/user";
import type { AppDatabase } from "@/db";

const DEFAULT_AIRCRAFT = [
    "Cessna Caravan",
    "OH-DZF",
    "Cessna 182",
    "OH-AIK",
    "Cessna 206",
    "OH-ARR",
];

const DEFAULT_LOCATIONS = ["EFUT", "EFJY", "EFAL", "EFSE", "EFLP"];

const DEFAULT_JUMP_TYPES = [
    "Cutaway",
    "FS",
    "Static Line",
    "Wingsuit",
    "Freefly",
    "AFF",
];

async function createDefaultJumpItems(db: AppDatabase, userUuid: string) {
    await Promise.all([
        db
            .insert(aircrafts)
            .values(DEFAULT_AIRCRAFT.map((name) => ({ userUuid, name })))
            .run(),
        db
            .insert(locations)
            .values(DEFAULT_LOCATIONS.map((name) => ({ userUuid, name })))
            .run(),
        db
            .insert(jumpTypes)
            .values(DEFAULT_JUMP_TYPES.map((name) => ({ userUuid, name })))
            .run(),
    ]);
}

const RegisterFormSchema = z
    .object({
        invitationCode: z.string().optional(),
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
    invitationRequired: boolean;
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

async function renderRegisterForm(c: AppRequestContext) {
    if (getAppContext(c).user) {
        return c.redirect(routes.logbook.index({}));
    }
    return c.render(
        <RegisterForm invitationRequired={await hasRegisteredUsers(c)} />,
    );
}

async function hasRegisteredUsers(c: AppRequestContext): Promise<boolean> {
    const user = await getAppContext(c)
        .db.select({ uuid: users.uuid })
        .from(users)
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

async function handleRegister(c: AppRequestContext) {
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

    const { invitationCode, username, displayName, email, password } =
        result.data;
    const db = getAppContext(c).db;
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
    const createdUser = await createRegistrationUser(
        db,
        {
            username,
            displayName,
            email,
            passwordHash,
        },
        invitationCode,
    );
    if ("error" in createdUser)
        return c.render(
            <RegisterForm
                errors={[createdUser.error]}
                invitationRequired
                {...formProps}
            />,
        );

    const newUserUuid = createdUser.uuid;
    await createDefaultJumpItems(db, newUserUuid);
    await createSession(c, newUserUuid);
    return c.redirect(routes.logbook.index({}));
}

export function register(app: App) {
    app.get(routes.auth.register.route, renderRegisterForm);
    app.post(routes.auth.register.route, handleRegister);
}
