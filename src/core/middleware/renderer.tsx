import { jsxRenderer } from "hono/jsx-renderer";
import type { AppRouter } from "@/core/create-app";

export function registerRenderer(router: AppRouter): void {
    router.use(
        "*",
        jsxRenderer((props, c) => {
            // fragment for htmx
            if (c.req.path.includes("__")) {
                return <>{props.children}</>;
            }

            return router.appOptions.render({ children: props.children });
        }),
    );
}
