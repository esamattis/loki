/** Describes service worker lifecycle scope. */
export interface ServiceWorkerLifecycleScope {
    skipWaiting(): void;
    clients: { claim(): Promise<void> };
    addEventListener(type: "install", listener: () => void): void;
    addEventListener(
        type: "activate",
        listener: (event: {
            waitUntil(promise: Promise<unknown>): void;
        }) => void,
    ): void;
}

/** Installs cache cleanup and activation handlers on a service worker. */
export function $installServiceWorkerLifecycle(
    scope: ServiceWorkerLifecycleScope,
): void {
    scope.addEventListener("install", () => scope.skipWaiting());
    scope.addEventListener("activate", (event) =>
        event.waitUntil(scope.clients.claim()),
    );
}
