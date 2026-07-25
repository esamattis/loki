export function sourceAliases(baseUrl: string): Record<string, string> {
    const source = new URL("./src/", baseUrl).pathname;
    const path = (value: string) => `${source}${value}`;
    return {
        "@/app/app": path("core/create-app.tsx"),
        "@/app/user": path("core/user.ts"),
        "@/app/html-cache": path("core/html-cache.ts"),
        "@/app/logbook-page": path("core/app-page.tsx"),
        "@/app/logbook-header": path("core/app-header.tsx"),
        "@/app/main-menu": path("core/main-menu.tsx"),
        "@/components/icons": path("app/components/icons.tsx"),
        "@/components/menu-icons": path("app/components/menu-icons.tsx"),
        "@/components/jump-item-select": path(
            "app/components/jump-item-select.tsx",
        ),
        "@/components/export-logbook-button": path(
            "app/components/export-logbook-button.tsx",
        ),
        "@/components/ui/archive-toggle-form": path(
            "app/components/archive-toggle-form.tsx",
        ),
        "@/components/ui/merge-into-form": path(
            "app/components/merge-into-form.tsx",
        ),
        "@/components/ui/single-number-card": path(
            "app/components/single-number-card.tsx",
        ),
        "@/route-handlers/logbook": path("app/logbook"),
        "@/route-handlers": path("core/route-handlers"),
        "@/components": path("core/components"),
        "@/utils/csv": path("app/utils/csv.ts"),
        "@/utils": path("core/utils"),
        "@/route-tools": path("core/route-tools.ts"),
        "@/auth": path("core/auth.ts"),
        "@/account-uniqueness": path("core/account-uniqueness.ts"),
        "@/password": path("core/password.ts"),
        "@/date-time": path("core/date-time.ts"),
        "@/db": path("core/db.ts"),
        "@/db-sqlite": path("core/db-sqlite.ts"),
        "@/migrate-sqlite": path("core/migrate-sqlite.ts"),
        "@/server-timing": path("core/server-timing.ts"),
        "@/delete-account": path("core/delete-account.ts"),
        "@/app-assets": path("core/app-assets.ts"),
        "@/build-info": path("core/build-info.ts"),
        "@/node-sea": path("core/node-sea.ts"),
        "@/schema": path("app/schema.ts"),
        "@/options": path("app/options.ts"),
        "@/routes": path("app/routes.ts"),
        "@/altitude": path("app/altitude.ts"),
        "@/jump-image": path("app/jump-image.ts"),
        "@/format": path("app/format.ts"),
        "@": source,
    };
}
