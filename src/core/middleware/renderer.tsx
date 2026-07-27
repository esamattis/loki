import { jsxRenderer } from "hono/jsx-renderer";
import type { App } from "@/core/create-app";

export function registerRenderer(app: App): void {
    app.use(
        "*",
        jsxRenderer((props, c) => {
            // fragment for htmx
            if (c.req.path.includes("__")) {
                return <>{props.children}</>;
            }

            return app.appOptions.render({ children: props.children });
        }),
    );
}
