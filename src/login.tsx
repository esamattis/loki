import { eq, or } from "drizzle-orm";
import { deleteCookie, setCookie } from "hono/cookie";
import { app, getAppContext, type AppRequestContext } from "./app";
import { users } from "./schema";
import { z } from "zod/v4";
import clsx from "clsx";
import { AuthFormShell } from "./components/auth";
import { Script } from "./components/helpers";
import { useId } from "hono/jsx";
import { $assertElement } from "./utils";
import * as routes from "./routes";

const SESSION_COOKIE_NAME = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN_BITS = 256;

function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
    const binary = atob(base64);
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

async function derivePasswordHash(
    password: string,
    salt: Uint8Array<ArrayBuffer>,
    iterations: number,
): Promise<string> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveBits"],
    );
    const derived = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt,
            iterations,
            hash: "SHA-256",
        },
        keyMaterial,
        PBKDF2_KEYLEN_BITS,
    );
    return bytesToBase64(new Uint8Array(derived));
}

async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
    const hash = await derivePasswordHash(password, salt, PBKDF2_ITERATIONS);
    return `${PBKDF2_ITERATIONS}:${bytesToBase64(salt)}:${hash}`;
}

async function verifyPassword(
    password: string,
    storedHash: string,
): Promise<boolean> {
    const parts = storedHash.split(":");
    if (parts.length !== 3) {
        return false;
    }
    const [iterationsStr, saltBase64, hash] = parts;
    if (!iterationsStr || !saltBase64 || !hash) {
        return false;
    }
    const iterations = parseInt(iterationsStr, 10);
    if (Number.isNaN(iterations)) {
        return false;
    }
    const salt = base64ToBytes(saltBase64);
    const computedHash = await derivePasswordHash(password, salt, iterations);
    return computedHash === hash;
}

function Password(props: {
    name: string;
    label: string;
    placeholder?: string;
    required?: boolean;
    autofocus?: boolean;
    className?: string;
}) {
    const id = useId();
    return (
        <div>
            <label
                htmlFor={id}
                className="block text-sm font-medium text-gray-700 mb-1"
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
                    className={clsx(
                        "w-full px-3 py-3 sm:py-2 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base",
                        props.className,
                    )}
                    placeholder={props.placeholder}
                />
                <button
                    type="button"
                    id={`togglePassword-${id}`}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
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
    defaultValue?: string;
    className?: string;
}) {
    const id = useId();
    return (
        <div className={props.className}>
            <label
                htmlFor={id}
                className="block text-sm font-medium text-gray-700 mb-1"
            >
                {props.label}
            </label>
            <input
                type={props.type || "text"}
                autofocus={props.autofocus}
                id={id}
                name={props.name}
                required={props.required}
                defaultValue={props.defaultValue}
                className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
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
                defaultValue={props.usernameOrEmail}
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
                name="username"
                label="Username:"
                placeholder="Choose username"
                required
                autofocus
                defaultValue={props.username}
            />
            <TextInput
                name="displayName"
                label="Display name:"
                placeholder="Example: John Doe"
                defaultValue={props.displayName}
            />
            <TextInput
                name="email"
                label="Email:"
                type="email"
                placeholder="Email address"
                required
                defaultValue={props.email}
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

    const userRow = await db
        .select({
            uuid: users.uuid,
            password: users.password,
        })
        .from(users)
        .where(
            or(
                eq(users.username, usernameOrEmail),
                eq(users.email, usernameOrEmail),
            ),
        )
        .limit(1)
        .get();

    if (!userRow || !(await verifyPassword(password, userRow.password))) {
        return c.render(
            <LoginForm
                errors={["Invalid username or password"]}
                usernameOrEmail={usernameOrEmail}
                back={back}
            />,
        );
    }

    setSessionCookie(c, userRow.uuid);

    const redirectTo =
        back && back.startsWith("/") && back !== routes.login.route
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

async function handleRegister(c: AppRequestContext) {
    const formData = await c.req.formData();
    const raw = formDataToStrings(formData);
    const result = RegisterFormSchema.safeParse(raw);

    if (!result.success) {
        return c.render(
            <RegisterForm
                errors={result.error.issues.map((issue) => issue.message)}
                username={raw.username}
                displayName={raw.displayName}
                email={raw.email}
            />,
        );
    }

    const { username, displayName, email, password } = result.data;
    const db = getAppContext(c).db;

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
                username={username}
                displayName={displayName}
                email={email}
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
                username={username}
                displayName={displayName}
                email={email}
            />,
        );
    }

    const passwordHash = await hashPassword(password);

    await db
        .insert(users)
        .values({
            username,
            displayName: displayName || null,
            email,
            password: passwordHash,
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
                username={username}
                displayName={displayName}
                email={email}
            />,
        );
    }

    setSessionCookie(c, newUser.uuid);
    return c.redirect(routes.logbook({}));
}

app.post(routes.register.route, handleRegister);

async function handleLogout(c: AppRequestContext) {
    deleteCookie(c, SESSION_COOKIE_NAME);
    return c.redirect(routes.login({}));
}

app.post(routes.logout.route, handleLogout);

function setSessionCookie(c: Parameters<typeof setCookie>[0], uuid: string) {
    setCookie(c, SESSION_COOKIE_NAME, uuid, {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        maxAge: SESSION_MAX_AGE,
    });
}
