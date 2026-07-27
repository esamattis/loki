import { useAppContext } from "@/core/create-app";
import { useCoreLayoutUi } from "@/core/core-layout-context";
import { AppHeader } from "@/core/app-header";
import { MainMenu } from "@/core/main-menu";
import { Style } from "@/core/components/style";
import clsx from "clsx";
import { type Child } from "hono/jsx";

/**
 * Authenticated page chrome: header, main content, optional mobile form action
 * bar, and bottom navigation (or menu) on small screens.
 *
 * @param props.title - Optional page `<h1>`.
 * @param props.mobileAction - Fixed bar above bottom nav (e.g. form submit).
 * @param props.children - Main page body.
 */
export function AppPage(props: {
    title?: string;
    mobileAction?: Child;
    children: any;
}) {
    const appContext = useAppContext();
    const appUi = useCoreLayoutUi();
    const user = appContext.getUser();

    return (
        <div>
            <Style>
                {`
                    html { scroll-padding-top: 4rem; scroll-padding-bottom: ${props.mobileAction ? "9rem" : "5rem"}; }
                    @media (min-width: 640px) {
                        html { scroll-padding-top: 8rem; scroll-padding-bottom: 0; }
                    }
                    summary { list-style: none; }
                    summary::-webkit-details-marker { display: none; }
                `}
            </Style>
            <AppHeader />
            <main
                className={clsx(
                    "mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-8 sm:pb-8",
                    props.mobileAction ? "pb-40" : "pb-24",
                )}
            >
                {props.title && (
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
                        {props.title}
                    </h1>
                )}
                {props.children}
            </main>
            <div className="fixed bottom-0 left-0 right-0 z-30 sm:hidden">
                {props.mobileAction && (
                    <div
                        aria-label="Form actions"
                        className="border-t border-slate-200 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85"
                    >
                        <div className="mx-auto max-w-3xl px-4 py-2">
                            {props.mobileAction}
                        </div>
                    </div>
                )}
                <nav
                    aria-label={appUi.navigationLabel}
                    className="border-t border-slate-200 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85"
                >
                    <div className="mx-auto max-w-3xl px-4 py-2">
                        {appUi.navigation ? (
                            appUi.navigation({
                                end: (
                                    <MainMenu
                                        isAdmin={user.admin}
                                        menuClassName="bottom-full mb-2 max-h-[calc(100dvh-5rem)] overflow-y-auto"
                                    />
                                ),
                            })
                        ) : (
                            <MainMenu
                                isAdmin={user.admin}
                                menuClassName="bottom-full mb-2 max-h-[calc(100dvh-5rem)] overflow-y-auto"
                            />
                        )}
                    </div>
                </nav>
            </div>
        </div>
    );
}
