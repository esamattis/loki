import {
    getRequestContext,
    type AppRouter,
    type HonoRequestContext,
} from "@/core/create-app";
import { z } from "zod";
import { AuthFormShell } from "@/core/components/auth";
import { findUserForAuth, isSafeRedirectPath } from "@/core/auth";
import { Password, TextInput } from "@/core/route-handlers/auth/components";
import { createSession } from "@/core/route-handlers/auth/sessions";
import * as routes from "@/core/routes";

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
            alternateHref={routes.auth.register({})}
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

async function renderLoginForm(c: HonoRequestContext) {
    const user = getRequestContext(c).user;
    const back = c.req.query("back") ?? undefined;
    if (user) {
        const redirectTo =
            isSafeRedirectPath(back) && back !== routes.auth.login.route
                ? back
                : getRequestContext(c).appOptions.authenticatedHome;
        return c.redirect(redirectTo);
    }
    return c.render(<LoginForm back={back} />);
}

function formDataToStrings(formData: FormData): Record<string, string> {
    const values: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (typeof value === "string") {
            values[key] = value;
        }
    }
    return values;
}

async function handleLogin(c: HonoRequestContext) {
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
    const db = getRequestContext(c).db;
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
        isSafeRedirectPath(back) && back !== routes.auth.login.route
            ? back
            : getRequestContext(c).appOptions.authenticatedHome;
    return c.redirect(redirectTo);
}

export function register(app: AppRouter) {
    app.get(routes.auth.login, renderLoginForm);
    app.post(routes.auth.login, handleLogin);
}
