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

export function $installServiceWorkerLifecycle(
    scope: ServiceWorkerLifecycleScope,
): void {
    scope.addEventListener("install", () => scope.skipWaiting());
    scope.addEventListener("activate", (event) =>
        event.waitUntil(scope.clients.claim()),
    );
}
