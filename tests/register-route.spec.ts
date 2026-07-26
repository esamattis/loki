import { expect, test } from "@playwright/test";
import { Hono } from "hono";
import type { Env } from "@/core/create-app";
import { isRegisteredPublicPath, registerRoute } from "@/core/register-route";
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

    expect(isRegisteredPublicPath(app, "/favicon.ico")).toBe(true);
    expect(isRegisteredPublicPath(app, "/faviconXico")).toBe(false);
    expect(isRegisteredPublicPath(app, "/release-notes")).toBe(true);
    expect(isRegisteredPublicPath(app, "/releaseXnotes")).toBe(false);
});

test("matches encoded and multiple route parameters by segment", () => {
    const app = createTestApp();
    registerRoute(
        app,
        "get",
        route("/files/:directory/:filename").public(),
        (context) => context.text("file"),
    );

    expect(isRegisteredPublicPath(app, "/files/my%20docs/report.pdf")).toBe(
        true,
    );
    expect(isRegisteredPublicPath(app, "/files/a%2Fb/report.pdf")).toBe(true);
    expect(isRegisteredPublicPath(app, "/files/my-docs/report.pdf")).toBe(true);
    expect(isRegisteredPublicPath(app, "/files/report.pdf")).toBe(false);
    expect(isRegisteredPublicPath(app, "/files/a/b/report.pdf")).toBe(false);
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

    expect(isRegisteredPublicPath(app, "/accounts/example")).toBe(true);
    expect(isRegisteredPublicPath(app, "/accounts/settings")).toBe(false);
    expect(isRegisteredPublicPath(app, "/reports/example")).toBe(false);
});

test("public route declarations without handlers do not grant stale access", () => {
    const app = createTestApp();
    const removedRoute = route("/removed/:id").public();
    registerRoute(app, "get", route("/protected/:id"), (context) =>
        context.text("protected"),
    );

    expect(removedRoute.metadata.public).toBe(true);
    expect(isRegisteredPublicPath(app, "/removed/example")).toBe(false);
    expect(isRegisteredPublicPath(app, "/protected/example")).toBe(false);
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
    expect(isRegisteredPublicPath(app, "/methods")).toBe(true);
    expect(isRegisteredPublicPath(app, "/protected")).toBe(false);
});
