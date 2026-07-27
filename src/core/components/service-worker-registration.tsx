import { Script } from "@/core/components/script";
import { $select } from "@/core/utils";

/** Reveals the update toast element if it is present in the DOM. */
function $showUpdateToast(toastId: string) {
    const toast = $select.idOrNull(toastId, HTMLElement);
    if (toast) toast.hidden = false;
}

/**
 * Registers the service worker and shows the update toast when a new worker is
 * waiting or takes control after the first load.
 */
function $registerServiceWorker(workerUrl: string, toastId: string) {
    if (!("serviceWorker" in navigator)) return;
    const hadControllerOnLoad = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker
        .register(workerUrl)
        .then((registration) => {
            if (registration.waiting) $showUpdateToast(toastId);
            registration.addEventListener("updatefound", () => {
                const installingWorker = registration.installing;
                if (!installingWorker) return;
                installingWorker.addEventListener("statechange", () => {
                    if (
                        installingWorker.state === "installed" &&
                        navigator.serviceWorker.controller
                    )
                        $showUpdateToast(toastId);
                });
            });
        })
        .catch((error) => {
            console.error("Failed to register the service worker", error);
        });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (hadControllerOnLoad) $showUpdateToast(toastId);
    });
}
/**
 * Registers the app service worker and coordinates with `UpdateToast`.
 *
 * @param props.workerUrl - Absolute or root-relative service worker script URL.
 */
export function ServiceWorkerRegistration(props: { workerUrl: string }) {
    return (
        <Script
            $args={[props.workerUrl, "update-toast"]}
            $deps={[$select, $showUpdateToast]}
            $exec={$registerServiceWorker}
        />
    );
}
