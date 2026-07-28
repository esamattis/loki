import { Link } from "@/core/components/link";
import { useRequestContext } from "@/core/create-app";
import { useCoreLayoutUi } from "@/core/core-layout-context";
import * as routes from "@/core/routes";
import clsx from "clsx";

/**
 * Site footer with logo, name, home link, app-provided footer links, and an
 * optional Terms & Privacy link.
 *
 * @param props.hasBottomNavigation - Adds bottom margin when mobile bottom nav is present.
 * @param props.showPrivacyPolicy - When true, links to the privacy policy route.
 */
export function Footer(props: {
    hasBottomNavigation: boolean;
    showPrivacyPolicy: boolean;
}) {
    const options = useRequestContext().appOptions;
    const appUi = useCoreLayoutUi();
    return (
        <footer
            className={clsx(
                "mt-16 border-t border-slate-200 dark:border-slate-800",
                props.hasBottomNavigation && "mb-16 sm:mb-0",
            )}
        >
            <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row dark:text-slate-400">
                <div className="flex flex-col items-center gap-1 text-center sm:flex-row sm:items-center sm:text-left">
                    <div className="flex items-center gap-2">
                        <img
                            src={options.logoPath}
                            alt=""
                            aria-hidden="true"
                            className="h-6 w-auto"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {options.name}
                        </span>
                    </div>
                </div>
                <nav aria-label="Footer" className="flex items-center gap-4">
                    <Link href="/">Home</Link>
                    {appUi.footerLinks}
                    {props.showPrivacyPolicy && (
                        <Link
                            href={routes.privacy({}, {})}
                            aria-label="Footer terms & privacy policy"
                        >
                            Terms & Privacy
                        </Link>
                    )}
                </nav>
            </div>
        </footer>
    );
}
