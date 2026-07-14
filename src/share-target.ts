import { app, type AppRequestContext } from "./app";
import * as routes from "./routes";
import {
    JUMP_IMAGE_DB_NAME,
    JUMP_IMAGE_KEY,
    JUMP_IMAGE_STORE,
} from "./logbook/jump-from-image-client";

interface ShareTargetWorkerConfig {
    shareTargetPath: string;
    jumpFromImageUrl: string;
    fileFieldName: string;
    dbName: string;
    storeName: string;
    storageKey: string;
}

interface ShareTargetClients {
    claim(): Promise<void>;
}

interface ShareTargetExtendableEvent {
    waitUntil(promise: Promise<unknown>): void;
}

interface ShareTargetFetchEvent {
    request: Request;
    respondWith(response: Promise<Response> | Response): void;
}

interface ShareTargetServiceWorkerScope {
    skipWaiting(): void;
    clients: ShareTargetClients;
    location: { origin: string };
    addEventListener(type: "install", listener: () => void): void;
    addEventListener(
        type: "activate",
        listener: (event: ShareTargetExtendableEvent) => void,
    ): void;
    addEventListener(
        type: "fetch",
        listener: (event: ShareTargetFetchEvent) => void,
    ): void;
}

declare const self: ShareTargetServiceWorkerScope;

function $installShareTargetServiceWorker(config: ShareTargetWorkerConfig) {
    self.addEventListener("install", () => {
        self.skipWaiting();
    });

    self.addEventListener("activate", (event) => {
        event.waitUntil(self.clients.claim());
    });

    self.addEventListener("fetch", (event) => {
        const request = event.request;
        if (request.method !== "POST") {
            return;
        }
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(request.url);
        } catch {
            return;
        }
        if (parsedUrl.pathname !== config.shareTargetPath) {
            return;
        }
        event.respondWith(handleShareTargetRequest(event));
    });

    async function handleShareTargetRequest(
        event: ShareTargetFetchEvent,
    ): Promise<Response> {
        let formData: FormData;
        try {
            formData = await event.request.formData();
        } catch {
            return new Response("Invalid form data", { status: 400 });
        }
        const file = formData.get(config.fileFieldName);
        if (!(file instanceof File) || file.size === 0) {
            return new Response("No image file provided", { status: 400 });
        }

        try {
            await saveDraft(file);
        } catch {
            return new Response("Failed to save shared image", {
                status: 500,
            });
        }

        const redirectUrl = new URL(
            config.jumpFromImageUrl,
            self.location.origin,
        ).href;
        return Response.redirect(redirectUrl, 303);
    }

    function saveDraft(file: File): Promise<void> {
        return new Promise((resolve, reject) => {
            const openRequest = indexedDB.open(config.dbName, 1);
            openRequest.onupgradeneeded = () => {
                const db = openRequest.result;
                if (!db.objectStoreNames.contains(config.storeName)) {
                    db.createObjectStore(config.storeName);
                }
            };
            openRequest.onerror = () =>
                reject(
                    openRequest.error ?? new Error("Failed to open IndexedDB"),
                );
            openRequest.onsuccess = () => {
                const db = openRequest.result;
                const tx = db.transaction(config.storeName, "readwrite");
                tx.objectStore(config.storeName).put(
                    {
                        blob: file,
                        name: file.name,
                        type: file.type,
                        lastModified: file.lastModified,
                    },
                    config.storageKey,
                );
                tx.oncomplete = () => {
                    db.close();
                    resolve();
                };
                tx.onerror = () => {
                    db.close();
                    reject(tx.error ?? new Error("Failed to save image draft"));
                };
            };
        });
    }
}

app.get(routes.serviceWorker.route, (c: AppRequestContext) => {
    const config: ShareTargetWorkerConfig = {
        shareTargetPath: routes.jumpImageShareTarget({}),
        jumpFromImageUrl: routes.jumpFromImage({}),
        fileFieldName: "image",
        dbName: JUMP_IMAGE_DB_NAME,
        storeName: JUMP_IMAGE_STORE,
        storageKey: JUMP_IMAGE_KEY,
    };
    const workerSource = `(${$installShareTargetServiceWorker.toString()})(${JSON.stringify(config)});`;
    return c.body(workerSource, 200, {
        "Content-Type": "text/javascript; charset=utf-8",
        "Service-Worker-Allowed": "/",
    });
});
