import { useId } from "hono/jsx";
import { type App, type AppRequestContext } from "@/app/app";
import { LogbookPage } from "@/app/authenticated-page";
import { Button } from "@/components/form";
import { Script } from "@/components/script";
import * as routes from "@/routes";
import { $select } from "@/utils";

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function $showAndroidChromeHint(hint: HTMLParagraphElement) {
    const ua = navigator.userAgent;
    const notChrome =
        Boolean(Reflect.get(navigator, "brave")) ||
        /SamsungBrowser|Firefox|OPR\/|Opera/i.test(ua) ||
        !/Chrome\//i.test(ua);
    if (/Android/i.test(ua) && notChrome) {
        hint.hidden = false;
        hint.textContent =
            "For the best experience on Android, install this app using Chrome. " +
            "Chrome enables sharing images from other apps directly into Loki.";
    }
}

export function $getInstallUnavailableMessage() {
    if (!window.isSecureContext) {
        return "Loki cannot be installed because this server is not configured to use a secure context. App installation requires HTTPS. Please contact the person who manages this Loki server.";
    }
    if (!("serviceWorker" in navigator)) {
        return "Loki cannot be installed because this browser does not support the offline features required for installation. Open this page in a current version of Chrome, Edge, or Safari.";
    }
    if (window.top !== window.self) {
        return "Loki cannot be installed while this page is embedded in another app or website. Open it directly in your browser and try again.";
    }
    const ua = navigator.userAgent;
    if (
        /iPhone|iPad|iPod/i.test(ua) ||
        (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
    ) {
        return "The install button is unavailable because browsers on iPhone and iPad do not offer an app installation prompt. In Safari, tap Share, then Add to Home Screen.";
    }
    if (/Android/i.test(ua)) {
        return "The install button is unavailable because this browser did not offer an app installation prompt. Open this page in Chrome, then choose Install app or Add to Home screen from the browser menu.";
    }
    return "The install button is unavailable because this browser did not offer an app installation prompt. This can happen when installation was previously dismissed or the browser does not support automatic prompts. Try the browser menu’s Install app or Add to Home Screen option, or open this page in Chrome or Edge.";
}

export function $getUninstallInstructions() {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) {
        return "To uninstall it on Android, touch and hold the Loki icon, tap App info, then tap Uninstall.";
    }
    if (
        /iPhone|iPad|iPod/i.test(ua) ||
        (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
    ) {
        return "To uninstall it on iPhone or iPad, touch and hold the Loki icon, then tap Remove App and Delete App.";
    }
    if (/Windows/i.test(ua)) {
        return "To uninstall it on Windows, open Settings, go to Apps and Installed apps, then uninstall Loki.";
    }
    if (/Macintosh/i.test(ua)) {
        return "To uninstall it on macOS, open Loki, open the app menu in the title bar, then choose Uninstall Loki.";
    }
    return "To uninstall it, open Loki, open the app menu in the title bar, then choose Uninstall Loki.";
}

function InstallApp() {
    const buttonId = useId();
    const statusId = useId();
    const hintId = useId();
    const errorId = useId();
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Add Loki to your home screen for quick access.
            </p>
            <p
                id={hintId}
                hidden
                className="mt-2 text-sm text-amber-600 dark:text-amber-400"
            ></p>
            <div
                id={errorId}
                role="alert"
                hidden
                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
            ></div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button id={buttonId} type="button" variant="primary" hidden>
                    Install
                </Button>
                <p
                    id={statusId}
                    className="text-sm text-slate-500 dark:text-slate-400"
                ></p>
            </div>
            <Script
                $deps={[
                    $select,
                    $showAndroidChromeHint,
                    $getInstallUnavailableMessage,
                    $getUninstallInstructions,
                ]}
                $args={[{ buttonId, statusId, hintId, errorId }]}
                $exec={(ids: {
                    buttonId: string;
                    statusId: string;
                    hintId: string;
                    errorId: string;
                }) => {
                    const buttonEl = $select.id(
                        ids.buttonId,
                        HTMLButtonElement,
                    );
                    const button: HTMLButtonElement = buttonEl;
                    const statusEl = $select.id(ids.statusId, HTMLElement);
                    const status: HTMLElement = statusEl;
                    const hintEl = $select.id(ids.hintId, HTMLParagraphElement);
                    const hint: HTMLParagraphElement = hintEl;
                    const errorEl = $select.id(ids.errorId, HTMLDivElement);
                    const error: HTMLDivElement = errorEl;
                    $showAndroidChromeHint(hint);

                    let deferredPrompt: BeforeInstallPromptEvent | null = null;

                    function isBeforeInstallPromptEvent(
                        event: Event,
                    ): event is BeforeInstallPromptEvent {
                        if (!("prompt" in event) || !("userChoice" in event)) {
                            return false;
                        }
                        const candidate: {
                            prompt?: unknown;
                            userChoice?: unknown;
                        } = event;
                        return typeof candidate.prompt === "function";
                    }

                    function isStandalone() {
                        return (
                            window.matchMedia("(display-mode: standalone)")
                                .matches ||
                            Boolean(Reflect.get(navigator, "standalone"))
                        );
                    }

                    function setInstalledStatus() {
                        setStatus(
                            `App is already installed. ${$getUninstallInstructions()}`,
                        );
                    }

                    function setStatus(message: string) {
                        status.textContent = message;
                    }

                    function hideError() {
                        error.hidden = true;
                        error.textContent = "";
                    }

                    function showInstallUnavailableError() {
                        error.textContent = $getInstallUnavailableMessage();
                        error.hidden = false;
                    }

                    function showInstallButton() {
                        button.hidden = false;
                        hideError();
                        setStatus("");
                    }

                    function hideInstallButton() {
                        button.hidden = true;
                    }

                    if (isStandalone()) {
                        hideInstallButton();
                        hideError();
                        setInstalledStatus();
                        return;
                    }

                    window.addEventListener("beforeinstallprompt", (event) => {
                        event.preventDefault();
                        if (isBeforeInstallPromptEvent(event)) {
                            deferredPrompt = event;
                            showInstallButton();
                        }
                    });

                    window.addEventListener("appinstalled", () => {
                        deferredPrompt = null;
                        hideInstallButton();
                        hideError();
                        setInstalledStatus();
                    });

                    button.addEventListener("click", async () => {
                        if (!deferredPrompt) {
                            return;
                        }
                        await deferredPrompt.prompt();
                        const choice = await deferredPrompt.userChoice;
                        deferredPrompt = null;
                        hideInstallButton();
                        if (choice.outcome === "accepted") {
                            setInstalledStatus();
                        } else {
                            setStatus(
                                "Install dismissed. You can try again later.",
                            );
                        }
                    });

                    setTimeout(() => {
                        if (!deferredPrompt && !isStandalone()) {
                            setStatus("");
                            showInstallUnavailableError();
                        }
                    }, 500);
                }}
            />
        </div>
    );
}

function renderInstallPage(c: AppRequestContext) {
    return c.render(
        <LogbookPage title="Install app">
            <InstallApp />
        </LogbookPage>,
    );
}

export function register(app: App) {
    app.get(routes.install.route, renderInstallPage);
}
