import { Script } from "@/components/script";

function $showUpdateToast(toastId: string) {
    const toast = document.getElementById(toastId);
    if (toast instanceof HTMLElement) toast.hidden = false;
}
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
        .catch(() => {
            /* Ignore registration failures. */
        });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (hadControllerOnLoad) $showUpdateToast(toastId);
    });
}
export function ServiceWorkerRegistration(props: { workerUrl: string }) {
    return (
        <Script
            $args={[props.workerUrl, "update-toast"]}
            $deps={[$showUpdateToast]}
            $exec={$registerServiceWorker}
        />
    );
}
