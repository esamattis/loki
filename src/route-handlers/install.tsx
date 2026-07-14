import { useId } from "hono/jsx";
import { type App, type AppRequestContext } from "@/app/app";
import { LogbookPage } from "@/app/authenticated-page";
import { Button } from "@/components/form";
import { Script } from "@/components/script";
import * as routes from "@/routes";
import { $assertElement, $showAndroidChromeHint } from "@/utils";

function InstallApp() {
    const buttonId = useId();
    const statusId = useId();
    const hintId = useId();
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
                $deps={[$assertElement, $showAndroidChromeHint]}
                $args={[buttonId, statusId, hintId]}
                $exec={(buttonId: string, statusId: string, hintId: string) => {
                    const buttonEl = document.getElementById(buttonId);
                    $assertElement(buttonEl, HTMLButtonElement);
                    const button: HTMLButtonElement = buttonEl;
                    const statusEl = document.getElementById(statusId);
                    $assertElement(statusEl, HTMLElement);
                    const status: HTMLElement = statusEl;
                    const hintEl = document.getElementById(hintId);
                    $assertElement(hintEl, HTMLParagraphElement);
                    const hint: HTMLParagraphElement = hintEl;
                    $showAndroidChromeHint(hint);

                    type BeforeInstallPromptEvent = Event & {
                        prompt: () => Promise<void>;
                        userChoice: Promise<{
                            outcome: "accepted" | "dismissed";
                        }>;
                    };

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

                    function getUninstallInstructions() {
                        const ua = navigator.userAgent;
                        if (/Android/i.test(ua)) {
                            return "To uninstall it on Android, touch and hold the Loki icon, tap App info, then tap Uninstall.";
                        }
                        if (
                            /iPhone|iPad|iPod/i.test(ua) ||
                            (/Macintosh/i.test(ua) &&
                                navigator.maxTouchPoints > 1)
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

                    function setInstalledStatus() {
                        setStatus(
                            `App is already installed. ${getUninstallInstructions()}`,
                        );
                    }

                    function setStatus(message: string) {
                        status.textContent = message;
                    }

                    function showInstallButton() {
                        button.hidden = false;
                        setStatus("");
                    }

                    function hideInstallButton() {
                        button.hidden = true;
                    }

                    if (isStandalone()) {
                        hideInstallButton();
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
                            setStatus(
                                "Use your browser’s “Add to Home Screen” option to install.",
                            );
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
