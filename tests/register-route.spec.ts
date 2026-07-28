import { expect, test } from "@playwright/test";
import { html } from "hono/html";
import type { AppRouter } from "@/core/create-app";
import {
    isRegisteredPrivacyPolicyExemptRoute,
    isRegisteredPublicRoute,
} from "@/core/register-route";
import { route } from "@/core/route-tools";

let AppRouterClass: typeof import("@/core/create-app").AppRouter;

test.beforeAll(async () => {
    Reflect.set(globalThis, "__APP_REVISION__", "test-revision");
    Reflect.set(globalThis, "__APP_VERSION__", "");
    AppRouterClass = (await import("@/core/create-app")).AppRouter;
});

function createTestApp(): AppRouter {
    return new AppRouterClass({
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
    });
}

test("matches literal dots and dashes exactly", () => {
    const app = createTestApp();
    app.get(route("/favicon.ico").public(), (context) => context.text("icon"));
    app.get(route("/release-notes").public(), (context) =>
        context.text("notes"),
    );

    expect(isRegisteredPublicRoute(app, "GET", "/favicon.ico")).toBe(true);
    expect(isRegisteredPublicRoute(app, "GET", "/faviconXico")).toBe(false);
    expect(isRegisteredPublicRoute(app, "GET", "/release-notes")).toBe(true);
    expect(isRegisteredPublicRoute(app, "GET", "/releaseXnotes")).toBe(false);
});

test("matches encoded and multiple route parameters by segment", () => {
    const app = createTestApp();
    app.get(route("/files/:directory/:filename").public(), (context) =>
        context.text(context.req.param("filename")),
    );

    expect(
        isRegisteredPublicRoute(app, "GET", "/files/my%20docs/report.pdf"),
    ).toBe(true);
    expect(isRegisteredPublicRoute(app, "GET", "/files/a%2Fb/report.pdf")).toBe(
        true,
    );
    expect(
        isRegisteredPublicRoute(app, "GET", "/files/my-docs/report.pdf"),
    ).toBe(true);
    expect(isRegisteredPublicRoute(app, "GET", "/files/report.pdf")).toBe(
        false,
    );
    expect(isRegisteredPublicRoute(app, "GET", "/files/a/b/report.pdf")).toBe(
        false,
    );
});

test("protected routes win overlapping matches at equal or greater specificity", () => {
    const app = createTestApp();
    app.get(route("/accounts/:accountId").public(), (context) =>
        context.text("public account"),
    );
    app.get(route("/accounts/settings"), (context) =>
        context.text("protected settings"),
    );
    app.get(route("/reports/:publicId").public(), (context) =>
        context.text("public report"),
    );
    app.get(route("/reports/:protectedId"), (context) =>
        context.text("protected report"),
    );

    expect(isRegisteredPublicRoute(app, "GET", "/accounts/example")).toBe(true);
    expect(isRegisteredPublicRoute(app, "GET", "/accounts/settings")).toBe(
        false,
    );
    expect(isRegisteredPublicRoute(app, "GET", "/reports/example")).toBe(false);
});

test("public route declarations without handlers do not grant stale access", () => {
    const app = createTestApp();
    const removedRoute = route("/removed/:id").public();
    app.get(route("/protected/:id"), (context) => context.text("protected"));

    expect(removedRoute.metadata.public).toBe(true);
    expect(isRegisteredPublicRoute(app, "GET", "/removed/example")).toBe(false);
    expect(isRegisteredPublicRoute(app, "GET", "/protected/example")).toBe(
        false,
    );
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
    }
    expect(isRegisteredPublicRoute(app, "GET", "/methods")).toBe(true);
    expect(isRegisteredPublicRoute(app, "HEAD", "/methods")).toBe(true);
    expect(isRegisteredPublicRoute(app, "GET", "/protected")).toBe(false);
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
    expect(await (await app.request("/current")).text()).toBe("current");
    expect(isRegisteredPublicRoute(app, "GET", "/native")).toBe(false);
});

test("access metadata is independent for each method on the same route", () => {
    const app = createTestApp();
    const publicEndpoint = route("/shared").public();
    const protectedEndpoint = route("/shared");
    app.get(publicEndpoint, (context) => context.text("public"));
    app.post(protectedEndpoint, (context) => context.text("protected"));

    expect(isRegisteredPublicRoute(app, "GET", "/shared")).toBe(true);
    expect(isRegisteredPublicRoute(app, "HEAD", "/shared")).toBe(true);
    expect(isRegisteredPublicRoute(app, "POST", "/shared")).toBe(false);
});

test("public asset routes are exempt from privacy acceptance", () => {
    const app = createTestApp();
    app.get(route("/logo.svg").publicAsset(), (context) =>
        context.text("logo"),
    );
    app.get(route("/about").public(), (context) => context.text("about"));

    expect(isRegisteredPrivacyPolicyExemptRoute(app, "GET", "/logo.svg")).toBe(
        true,
    );
    expect(isRegisteredPrivacyPolicyExemptRoute(app, "GET", "/about")).toBe(
        false,
    );
});

test("rejects route patterns outside the supported grammar", () => {
    const app = createTestApp();

    expect(() =>
        app.get(route("/files/:path{.+}"), (context) =>
            context.text("unsupported"),
        ),
    ).toThrow(/Unsupported route pattern/);
});
