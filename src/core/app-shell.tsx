import { ViteClient } from "vite-ssr-components/hono";
import type { Child } from "hono/jsx";
import { htmxAsset, tailwindAsset } from "@/core/app-assets";
import { DisableViewTransitionsInAutomation } from "@/core/components/disable-view-transitions-in-automation";
import { ServiceWorkerRegistration } from "@/core/components/service-worker-registration";
import { SocialMeta } from "@/core/components/social-meta";
import { ThemeScript } from "@/core/components/theme-script";
import { useAppContext } from "@/core/create-app";
import * as routes from "@/core/routes";

export function AppShell(props: { children: Child }) {
    const appContext = useAppContext();
    const options = appContext.appOptions;
    const user = appContext.user;
    const title = user
        ? `${user.getDisplayName()} – ${options.title}`
        : options.title;

    return (
        <html lang="en">
            <head>
                <meta charSet="UTF-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                />
                <ViteClient />
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="icon" href={options.logoPath} type="image/svg+xml" />
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content={options.themeColor} />
                <link
                    rel="apple-touch-icon"
                    sizes="72x72"
                    href="/apple-72x72.png"
                />
                <link
                    rel="apple-touch-icon"
                    sizes="144x144"
                    href="/apple-144x144.png"
                />

                <title>{title}</title>
                <SocialMeta title={title} url={appContext.url()} />
                <ThemeScript />
                {user && (
                    <ServiceWorkerRegistration
                        workerUrl={routes.serviceWorker({})}
                    />
                )}
                <link
                    href={routes.assets.tailwindCss({
                        fingerprint: tailwindAsset.fingerprint,
                    })}
                    rel="stylesheet"
                />
                {/* After CSS so automation can override @view-transition. */}
                <DisableViewTransitionsInAutomation />
                <script
                    src={routes.assets.htmxScript({
                        fingerprint: htmxAsset.fingerprint,
                    })}
                    type="module"
                ></script>
            </head>
            <body
                style={{
                    ["--animation-duration"]: "5000ms",
                }}
                className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-200"
            >
                {props.children}
            </body>
        </html>
    );
}
