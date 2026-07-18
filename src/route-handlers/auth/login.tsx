import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import { z } from "zod";
import { AuthFormShell } from "@/components/auth";
import { findUserForAuth, isSafeRedirectPath } from "@/auth";
import { Password, TextInput } from "@/route-handlers/auth/components";
import { createSession } from "@/route-handlers/auth/sessions";
import * as routes from "@/routes";

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

async function renderLoginForm(c: AppRequestContext) {
    const user = getAppContext(c).user;
    const back = c.req.query("back") ?? undefined;
    if (user) {
        const redirectTo =
            isSafeRedirectPath(back) && back !== routes.auth.login.route
                ? back
                : routes.logbook.index({});
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
        isSafeRedirectPath(back) && back !== routes.auth.login.route
            ? back
            : routes.logbook.index({});
    return c.redirect(redirectTo);
}

export function register(app: App) {
    app.get(routes.auth.login.route, renderLoginForm);
    app.post(routes.auth.login.route, handleLogin);
}
