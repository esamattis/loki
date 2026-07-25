import { jsxRenderer } from "hono/jsx-renderer";
import { ViteClient } from "vite-ssr-components/hono";
import { htmxAsset, tailwindAsset } from "@/core/app-assets";
import { BackgroundGradients } from "@/core/components/background-gradients";
import { DisableViewTransitionsInAutomation } from "@/core/components/disable-view-transitions-in-automation";
import { Footer } from "@/core/components/footer";
import {
    DisableFormOnSubmit,
    ShowProgressOnLinkClick,
} from "@/core/components/navigation-progress";
import { RestoreFormScrollPosition } from "@/core/components/restore-form-scroll-position";
import { ReturnAfterFormPost } from "@/core/components/return-after-form-post";
import { ServiceWorkerRegistration } from "@/core/components/service-worker-registration";
import { SocialMeta } from "@/core/components/social-meta";
import { ThemeScript } from "@/core/components/theme-script";
import { Tooltips } from "@/core/components/tooltips";
import { UnsavedChangesDialog as UnsavedChangesDialogComponent } from "@/core/components/unsaved-changes-dialog";
import { UpdateToast as UpdateToastComponent } from "@/core/components/update-toast";
import type { App } from "@/core/create-app";
import { getAppContext } from "@/core/create-app";
import * as routes from "@/core/routes";

function createRenderer() {
    return jsxRenderer((props, c) => {
        // fragment for htmx
        if (c.req.path.includes("__")) {
            return <>{props.children}</>;
        }

        const appContext = getAppContext(c);
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
                    <link
                        rel="icon"
                        href={options.logoPath}
                        type="image/svg+xml"
                    />
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
                    <SocialMeta title={title} url={new URL(c.req.url)} />
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
                    <BackgroundGradients />
                    <ReturnAfterFormPost />
                    <div className="flex-1">{props.children}</div>
                    <Footer
                        hasBottomNavigation={Boolean(user)}
                        showPrivacyPolicy={!appContext.isSelfHosted()}
                    />
                    <UnsavedChangesDialogComponent />
                    <UpdateToastComponent />
                    <RestoreFormScrollPosition />
                    <Tooltips />
                    <DisableFormOnSubmit />
                    <ShowProgressOnLinkClick />
                </body>
            </html>
        );
    });
}

export function registerRenderer(app: App): void {
    app.use("*", createRenderer());
}
