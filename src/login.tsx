import { and, eq, gt, sql } from "drizzle-orm";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { app, getAppContext, type AppRequestContext } from "./app";
import { invitations, jumpTypes, sessions, users } from "./schema";
import { z } from "zod";
import clsx from "clsx";
import { AuthFormShell } from "./components/auth";
import { Script } from "./components/helpers";
import { useId } from "hono/jsx";
import { $assertElement } from "./utils";
import {
    findUserForAuth,
    generateSessionToken,
    hashPassword,
    hashToken,
    isSafeRedirectPath,
    SESSION_COOKIE_NAME,
    sessionCookieOptions,
    SESSION_MAX_AGE,
} from "./auth";
import { DEFAULT_USER_OPTIONS_JSON } from "./options";
import * as routes from "./routes";

export { hashPassword } from "./auth";

const DEFAULT_JUMP_TYPES = [
    "Cutaway",
    "FS",
    "Static Line",
    "Wingsuit",
    "Freefly",
    "AFF",
];

export function Password(props: {
    name: string;
    label: string;
    placeholder?: string;
    required?: boolean;
    autofocus?: boolean;
    value?: string;
    className?: string;
}) {
    const id = useId();
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
                {props.label}
            </label>
            <div className="relative">
                <input
                    type="password"
                    autofocus={props.autofocus}
                    id={id}
                    name={props.name}
                    required={props.required}
                    value={props.value}
                    className={clsx(
                        "w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 pr-12 text-base text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 sm:py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30",
                        props.className,
                    )}
                    placeholder={props.placeholder}
                    autocomplete="off"
                />
                <button
                    type="button"
                    id={`togglePassword-${id}`}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-slate-400 transition hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 rounded-full p-1 dark:text-slate-500 dark:hover:text-slate-300 dark:focus:ring-indigo-400/40"
                    aria-label="Show/hide password"
                >
                    <span id={`eyeIcon-${id}`}>👁️</span>
                </button>
            </div>

            <Script
                $deps={[$assertElement]}
                $args={[id]}
                $exec={(inputId) => {
                    function togglePasswordVisibility() {
                        const input = document.getElementById(inputId);
                        $assertElement(input, HTMLInputElement);
                        const eyeIcon = document.getElementById(
                            `eyeIcon-${inputId}`,
                        );
                        $assertElement(eyeIcon, HTMLElement);

                        if (input.type === "password") {
                            input.type = "text";
                            eyeIcon.textContent = "🙈";
                        } else {
                            input.type = "password";
                            eyeIcon.textContent = "👁️";
                        }
                        input.focus();
                    }

                    const toggleButton = document.getElementById(
                        `togglePassword-${inputId}`,
                    );
                    if (toggleButton) {
                        toggleButton.addEventListener(
                            "click",
                            togglePasswordVisibility,
                        );
                    }
                }}
            />
        </div>
    );
}

function TextInput(props: {
    name: string;
    label: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
    autofocus?: boolean;
    value?: string;
    className?: string;
}) {
    const id = useId();
    return (
        <div className={props.className}>
            <label
                htmlFor={id}
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
                {props.label}
            </label>
            <input
                type={props.type || "text"}
                autofocus={props.autofocus}
                id={id}
                name={props.name}
                required={props.required}
                value={props.value}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-base text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 sm:py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/30"
                placeholder={props.placeholder}
            />
        </div>
    );
}

const LoginFormSchema = z.object({
    usernameOrEmail: z.string().min(1, "Username or email is required"),
    password: z.string().min(1, "Password is required"),
    back: z.string().optional(),
});

function LoginForm(props: {
    errors?: string[];
    usernameOrEmail?: string;
    back?: string;
}) {
    return (
        <AuthFormShell
            title="Log in"
            errors={props.errors ?? []}
            submitLabel="Log in"
            alternateHref={routes.register({})}
            alternateLabel="Create account →"
        >
            <input type="hidden" name="back" value={props.back ?? ""} />
            <TextInput
                name="usernameOrEmail"
                label="Username or email:"
                placeholder="Enter username or email"
                required
                autofocus
                value={props.usernameOrEmail}
            />
            <Password
                name="password"
                label="Password:"
                placeholder="Enter password"
                required
            />
        </AuthFormShell>
    );
}

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
            alternateHref={routes.login({})}
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

async function renderLoginForm(c: AppRequestContext) {
    const user = getAppContext(c).user;
    if (user) {
        return c.redirect(routes.logbook({}));
    }
    const back = c.req.query("back") ?? undefined;
    return c.render(<LoginForm back={back} />);
}

app.get(routes.login.route, renderLoginForm);

function formDataToStrings(formData: FormData): Record<string, string> {
    const values: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (typeof value === "string") {
            values[key] = value;
        }
    }
    return values;
}

async function handleLogin(c: AppRequestContext) {
    const formData = await c.req.formData();
    const raw = formDataToStrings(formData);
    const result = LoginFormSchema.safeParse(raw);

    if (!result.success) {
        return c.render(
            <LoginForm
                errors={result.error.issues.map((issue) => issue.message)}
                usernameOrEmail={raw.usernameOrEmail}
                back={raw.back}
            />,
        );
    }

    const { usernameOrEmail, password, back } = result.data;
    const db = getAppContext(c).db;
    const authUser = await findUserForAuth(db, usernameOrEmail, password);

    if (!authUser) {
        return c.render(
            <LoginForm
                errors={["Invalid username or password"]}
                usernameOrEmail={usernameOrEmail}
                back={back}
            />,
        );
    }

    await createSession(c, authUser.uuid);

    const redirectTo =
        isSafeRedirectPath(back) && back !== routes.login.route
            ? back
            : routes.logbook({});
    return c.redirect(redirectTo);
}

app.post(routes.login.route, handleLogin);

async function renderRegisterForm(c: AppRequestContext) {
    const user = getAppContext(c).user;
    if (user) {
        return c.redirect(routes.logbook({}));
    }
    return c.render(<RegisterForm />);
}

app.get(routes.register.route, renderRegisterForm);

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
    const formData = await c.req.formData();
    const raw = formDataToStrings(formData);
    const result = RegisterFormSchema.safeParse(raw);

    if (!result.success) {
        return c.render(
            <RegisterForm
                errors={result.error.issues.map((issue) => issue.message)}
                {...registerFormProps(raw)}
            />,
        );
    }

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
    if (!invitation) {
        return c.render(
            <RegisterForm
                errors={["Invalid or exhausted invitation code"]}
                {...formProps}
            />,
        );
    }

    const existingByUsername = await db
        .select({ uuid: users.uuid })
        .from(users)
        .where(eq(users.username, username))
        .limit(1)
        .get();
    if (existingByUsername) {
        return c.render(
            <RegisterForm
                errors={["Username is already in use"]}
                {...formProps}
            />,
        );
    }

    const existingByEmail = await db
        .select({ uuid: users.uuid })
        .from(users)
        .where(eq(users.email, email))
        .limit(1)
        .get();
    if (existingByEmail) {
        return c.render(
            <RegisterForm
                errors={["Email address is already in use"]}
                {...formProps}
            />,
        );
    }

    const passwordHash = await hashPassword(password);

    const consumed = await db
        .update(invitations)
        .set({ count: sql`${invitations.count} - 1` })
        .where(
            and(eq(invitations.code, invitationCode), gt(invitations.count, 0)),
        )
        .returning({ code: invitations.code })
        .get();
    if (!consumed) {
        return c.render(
            <RegisterForm
                errors={["Invalid or exhausted invitation code"]}
                {...formProps}
            />,
        );
    }

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

    if (!newUser) {
        return c.render(
            <RegisterForm
                errors={["User creation failed. Try again."]}
                {...formProps}
            />,
        );
    }

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
    return c.redirect(routes.logbook({}));
}

app.post(routes.register.route, handleRegister);

async function handleLogout(c: AppRequestContext) {
    await destroySession(c);
    return c.redirect(routes.login({}));
}

app.post(routes.logout.route, handleLogout);

export async function createSession(
    c: AppRequestContext,
    userUuid: string,
): Promise<void> {
    const token = generateSessionToken();
    const tokenHash = await hashToken(token);
    const now = Math.floor(Date.now() / 1000);

    await getAppContext(c)
        .db.insert(sessions)
        .values({
            tokenHash,
            userUuid,
            createdAt: now,
            expiresAt: now + SESSION_MAX_AGE,
            lastUsedAt: now,
        })
        .run();

    setCookie(c, SESSION_COOKIE_NAME, token, {
        ...sessionCookieOptions(c.req.url),
        maxAge: SESSION_MAX_AGE,
    });
}

export async function destroySession(c: AppRequestContext): Promise<void> {
    const token = getCookie(c, SESSION_COOKIE_NAME);
    if (token) {
        const tokenHash = await hashToken(token);
        await getAppContext(c)
            .db.delete(sessions)
            .where(eq(sessions.tokenHash, tokenHash))
            .run();
    }
    deleteCookie(c, SESSION_COOKIE_NAME, sessionCookieOptions(c.req.url));
}
