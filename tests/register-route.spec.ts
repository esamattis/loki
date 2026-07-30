import { expect, test } from "@playwright/test";
import { html } from "hono/html";
import type { AppRouter } from "@/core/create-app";
import {
    isRegisteredPrivacyPolicyExemptRoute,
    isRegisteredPublicRoute,
} from "@/core/register-route";
import { route } from "@/core/route-tools";
import * as coreRoutes from "@/core/routes";

let AppRouterClass: typeof import("@/core/create-app").AppRouter;
let registerPrivacyRoutes: typeof import("@/core/register-privacy-routes").registerPrivacyRoutes;

const PUBLIC_HEADER = "X-Test-Registered-Public";
const PRIVACY_EXEMPT_HEADER = "X-Test-Privacy-Exempt";

test.beforeAll(async () => {
    Reflect.set(globalThis, "__APP_REVISION__", "test-revision");
    Reflect.set(globalThis, "__APP_VERSION__", "");
    AppRouterClass = (await import("@/core/create-app")).AppRouter;
    registerPrivacyRoutes = (await import("@/core/register-privacy-routes"))
        .registerPrivacyRoutes;
});

function TestPrivacyPolicyContent() {
    return html`
        Test privacy policy
    `;
}

function createTestApp(withPrivacyPolicy = false): AppRouter {
    const app = new AppRouterClass({
        name: "Test",
        title: "Test",
        repositoryUrl: "https://example.com",
        description: "Test application",
        basicAuthRealm: "Test",
        authenticatedHome: "/",
        logoPath: "/logo.svg",
        themeColor: "#000000",
        socialImagePath: "/social.png",
        socialImageAlt: "Test",
        render: () => html`
            Test
        `,
        ...(withPrivacyPolicy
            ? { privacyPolicyContent: TestPrivacyPolicyContent }
            : {}),
    });
    app.use("*", async function accessMetadataProbe(context, next) {
        context.header(
            PUBLIC_HEADER,
            String(isRegisteredPublicRoute(app, context)),
        );
        context.header(
            PRIVACY_EXEMPT_HEADER,
            String(isRegisteredPrivacyPolicyExemptRoute(app, context)),
        );
        await next();
    });
    return app;
}

test("registers privacy routes only when the app opts in", () => {
    const optedOutApp = createTestApp();
    registerPrivacyRoutes(optedOutApp);
    expect(
        optedOutApp.routes.some(
            (registered) =>
                registered.path === coreRoutes.privacy.route &&
                (registered.method === "GET" || registered.method === "POST"),
        ),
    ).toBe(false);

    const optedInApp = createTestApp(true);
    registerPrivacyRoutes(optedInApp);
    expect(
        optedInApp.routes.filter(
            (registered) => registered.path === coreRoutes.privacy.route,
        ),
    ).toEqual(
        expect.arrayContaining([
            expect.objectContaining({ method: "GET" }),
            expect.objectContaining({ method: "POST" }),
        ]),
    );
});

async function isPublic(
    app: AppRouter,
    path: string,
    method = "GET",
): Promise<boolean> {
    const response = await app.request(path, { method });
    return response.headers.get(PUBLIC_HEADER) === "true";
}

async function isPrivacyExempt(app: AppRouter, path: string): Promise<boolean> {
    const response = await app.request(path);
    return response.headers.get(PRIVACY_EXEMPT_HEADER) === "true";
}

test("uses Hono matching for literal dots and dashes", async () => {
    const app = createTestApp();
    app.get(route("/favicon.ico").public(), (context) => context.text("icon"));
    app.get(route("/release-notes").public(), (context) =>
        context.text("notes"),
    );

    expect(await isPublic(app, "/favicon.ico")).toBe(true);
    expect(await isPublic(app, "/faviconXico")).toBe(false);
    expect(await isPublic(app, "/release-notes")).toBe(true);
    expect(await isPublic(app, "/releaseXnotes")).toBe(false);
});

test("uses Hono matching for encoded and multiple route parameters", async () => {
    const app = createTestApp();
    app.get(route("/files/:directory/:filename").public(), (context) =>
        context.text(context.req.param("filename")),
    );

    expect(await isPublic(app, "/files/my%20docs/report.pdf")).toBe(true);
    expect(await isPublic(app, "/files/a%2Fb/report.pdf")).toBe(true);
    expect(await isPublic(app, "/files/my-docs/report.pdf")).toBe(true);
    expect(await isPublic(app, "/files/report.pdf")).toBe(false);
    expect(await isPublic(app, "/files/a/b/report.pdf")).toBe(false);
});

test("uses Hono execution order for overlapping routes", async () => {
    const app = createTestApp();
    app.get(route("/accounts/:accountId").public(), (context) =>
        context.text("public account"),
    );
    app.get(route("/accounts/settings"), (context) =>
        context.text("protected settings"),
    );
    app.get(route("/reports/:protectedId"), (context) =>
        context.text("protected report"),
    );
    app.get(route("/reports/:publicId").public(), (context) =>
        context.text("public report"),
    );

    const accountResponse = await app.request("/accounts/settings");
    expect(await accountResponse.text()).toBe("public account");
    expect(accountResponse.headers.get(PUBLIC_HEADER)).toBe("true");

    const reportResponse = await app.request("/reports/example");
    expect(await reportResponse.text()).toBe("protected report");
    expect(reportResponse.headers.get(PUBLIC_HEADER)).toBe("false");
});

test("public route declarations without handlers do not grant stale access", async () => {
    const app = createTestApp();
    const removedRoute = route("/removed/:id").public();
    app.get(route("/protected/:id"), (context) => context.text("protected"));

    expect(removedRoute.metadata.public).toBe(true);
    expect(await isPublic(app, "/removed/example")).toBe(false);
    expect(await isPublic(app, "/protected/example")).toBe(false);
});

test("typed routes attach every supported request method", async () => {
    const app = createTestApp();
    const endpoint = route("/methods").public();
    for (const method of ["get", "post", "put", "patch", "delete"] as const) {
        app[method](endpoint, (context) => context.text(method.toUpperCase()));
    }

    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
        const response = await app.request("/methods", { method });
        expect(await response.text()).toBe(method);
        expect(response.headers.get(PUBLIC_HEADER)).toBe("true");
    }
    expect(await isPublic(app, "/methods", "HEAD")).toBe(true);
    expect(await isPublic(app, "/protected")).toBe(false);
});

test("native Hono route overloads remain available", async () => {
    const app = createTestApp();
    app.get(
        "/native",
        async (context, next) => {
            context.header("X-Middleware", "true");
            await next();
        },
        (context) => context.text("native"),
    );
    app.get("/current").get((context) => context.text("current"));

    const nativeResponse = await app.request("/native");
    expect(await nativeResponse.text()).toBe("native");
    expect(nativeResponse.headers.get("X-Middleware")).toBe("true");
    expect(nativeResponse.headers.get(PUBLIC_HEADER)).toBe("false");
    expect(await (await app.request("/current")).text()).toBe("current");
});

test("access metadata is independent for each method on the same route", async () => {
    const app = createTestApp();
    const publicEndpoint = route("/shared").public();
    const protectedEndpoint = route("/shared");
    app.get(publicEndpoint, (context) => context.text("public"));
    app.post(protectedEndpoint, (context) => context.text("protected"));

    expect(await isPublic(app, "/shared")).toBe(true);
    expect(await isPublic(app, "/shared", "HEAD")).toBe(true);
    expect(await isPublic(app, "/shared", "POST")).toBe(false);
});

test("public asset routes are exempt from privacy acceptance", async () => {
    const app = createTestApp();
    app.get(route("/logo.svg").publicAsset(), (context) =>
        context.text("logo"),
    );
    app.get(route("/about").public(), (context) => context.text("about"));

    expect(await isPrivacyExempt(app, "/logo.svg")).toBe(true);
    expect(await isPrivacyExempt(app, "/about")).toBe(false);
});

test("supports Hono custom route patterns", async () => {
    const app = createTestApp();

    app.get(route("/files/:path{.+}").public(), (context) =>
        context.text(context.req.param("path")),
    );

    const response = await app.request("/files/reports/2026");
    expect(await response.text()).toBe("reports/2026");
    expect(response.headers.get(PUBLIC_HEADER)).toBe("true");
});
