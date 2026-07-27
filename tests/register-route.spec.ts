import { expect, test } from "@playwright/test";
import { Hono } from "hono";
import type { Env } from "@/core/create-app";
import {
    isRegisteredPrivacyPolicyExemptRoute,
    isRegisteredPublicRoute,
    registerRoute,
} from "@/core/register-route";
import { route } from "@/core/route-tools";

function createTestApp(): Hono<Env> {
    return new Hono<Env>();
}

test("matches literal dots and dashes exactly", () => {
    const app = createTestApp();
    registerRoute(app, "get", route("/favicon.ico").public(), (context) =>
        context.text("icon"),
    );
    registerRoute(app, "get", route("/release-notes").public(), (context) =>
        context.text("notes"),
    );

    expect(isRegisteredPublicRoute(app, "GET", "/favicon.ico")).toBe(true);
    expect(isRegisteredPublicRoute(app, "GET", "/faviconXico")).toBe(false);
    expect(isRegisteredPublicRoute(app, "GET", "/release-notes")).toBe(true);
    expect(isRegisteredPublicRoute(app, "GET", "/releaseXnotes")).toBe(false);
});

test("matches encoded and multiple route parameters by segment", () => {
    const app = createTestApp();
    registerRoute(
        app,
        "get",
        route("/files/:directory/:filename").public(),
        (context) => context.text("file"),
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
    registerRoute(
        app,
        "get",
        route("/accounts/:accountId").public(),
        (context) => context.text("public account"),
    );
    registerRoute(app, "get", route("/accounts/settings"), (context) =>
        context.text("protected settings"),
    );
    registerRoute(app, "get", route("/reports/:publicId").public(), (context) =>
        context.text("public report"),
    );
    registerRoute(app, "get", route("/reports/:protectedId"), (context) =>
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
    registerRoute(app, "get", route("/protected/:id"), (context) =>
        context.text("protected"),
    );

    expect(removedRoute.metadata.public).toBe(true);
    expect(isRegisteredPublicRoute(app, "GET", "/removed/example")).toBe(false);
    expect(isRegisteredPublicRoute(app, "GET", "/protected/example")).toBe(
        false,
    );
});

test("registerRoute attaches every supported request method", async () => {
    const app = createTestApp();
    const endpoint = route("/methods").public();
    for (const method of ["get", "post", "put", "patch", "delete"] as const) {
        registerRoute(app, method, endpoint, (context) =>
            context.text(method.toUpperCase()),
        );
    }

    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
        const response = await app.request("/methods", { method });
        expect(await response.text()).toBe(method);
    }
    expect(isRegisteredPublicRoute(app, "GET", "/methods")).toBe(true);
    expect(isRegisteredPublicRoute(app, "HEAD", "/methods")).toBe(true);
    expect(isRegisteredPublicRoute(app, "GET", "/protected")).toBe(false);
});

test("access metadata is independent for each method on the same route", () => {
    const app = createTestApp();
    const publicEndpoint = route("/shared").public();
    const protectedEndpoint = route("/shared");
    registerRoute(app, "get", publicEndpoint, (context) =>
        context.text("public"),
    );
    registerRoute(app, "post", protectedEndpoint, (context) =>
        context.text("protected"),
    );

    expect(isRegisteredPublicRoute(app, "GET", "/shared")).toBe(true);
    expect(isRegisteredPublicRoute(app, "HEAD", "/shared")).toBe(true);
    expect(isRegisteredPublicRoute(app, "POST", "/shared")).toBe(false);
});

test("public asset routes are exempt from privacy acceptance", () => {
    const app = createTestApp();
    registerRoute(app, "get", route("/logo.svg").publicAsset(), (context) =>
        context.text("logo"),
    );
    registerRoute(app, "get", route("/about").public(), (context) =>
        context.text("about"),
    );

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
        registerRoute(app, "get", route("/files/:path{.+}"), (context) =>
            context.text("unsupported"),
        ),
    ).toThrow(/Unsupported route pattern/);
});
