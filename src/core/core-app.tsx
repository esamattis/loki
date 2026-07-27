import { ViteClient } from "vite-ssr-components/hono";
import type { Child } from "hono/jsx";
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
import { UnsavedChangesDialog } from "@/core/components/unsaved-changes-dialog";
import { UpdateToast } from "@/core/components/update-toast";
import { CoreAppProvider, type CoreAppUi } from "@/core/core-app-context";
import { useAppContext } from "@/core/create-app";
import * as routes from "@/core/routes";

export interface CoreAppProps extends CoreAppUi {
    children: Child;
}

function coreAppUi(props: CoreAppProps): CoreAppUi {
    return {
        authenticatedUserSubtitle: props.authenticatedUserSubtitle,
        navigationLabel: props.navigationLabel,
        navigation: props.navigation,
        menuItems: props.menuItems,
        footerLinks: props.footerLinks,
        registrationFields: props.registrationFields,
        preferencesContent: props.preferencesContent,
        privacyPolicyContent: props.privacyPolicyContent,
    };
}

export function CoreApp(props: CoreAppProps) {
    const appContext = useAppContext();
    const options = appContext.appOptions;
    const user = appContext.user;
    const title = user
        ? `${user.getDisplayName()} – ${options.title}`
        : options.title;

    if (props.registrationFields && !options.afterUserCreated) {
        throw new Error("registrationFields requires afterUserCreated");
    }

    return (
        <CoreAppProvider value={coreAppUi(props)}>
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
                    <BackgroundGradients />
                    <ReturnAfterFormPost />
                    <div className="flex-1">{props.children}</div>
                    <Footer
                        hasBottomNavigation={Boolean(user)}
                        showPrivacyPolicy={!appContext.isSelfHosted()}
                    />
                    <UnsavedChangesDialog />
                    <UpdateToast />
                    <RestoreFormScrollPosition />
                    <Tooltips />
                    <DisableFormOnSubmit />
                    <ShowProgressOnLinkClick />
                </body>
            </html>
        </CoreAppProvider>
    );
}
