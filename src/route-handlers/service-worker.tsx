import { type App, type AppRequestContext } from "@/app/app";
import * as routes from "@/routes";
import {
    JUMP_IMAGE_DB_NAME,
    JUMP_IMAGE_KEY,
    JUMP_IMAGE_STORE,
} from "@/route-handlers/logbook/jumps/image-client";

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

function serviceWorker(c: AppRequestContext) {
    const config: ShareTargetWorkerConfig = {
        shareTargetPath: routes.logbook.jumps.imageShare({}),
        jumpFromImageUrl: routes.logbook.jumps.fromImage({}),
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
}

// The worker normally intercepts this POST to persist its image payload.
// A server response cannot recover the file, so make the failed import explicit.
function imageShareFallback(c: AppRequestContext) {
    c.status(503);
    return c.render(
        <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-6 px-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-2xl dark:bg-red-950/50">
                ⚠
            </div>
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Image share unavailable
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    The shared image could not be imported because the app's
                    service worker did not handle the request. Open Hypyt, then
                    share the image again.
                </p>
            </div>
            <a
                href={routes.logbook.index({})}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
                Open logbook
            </a>
        </div>,
    );
}

export function register(app: App) {
    app.get(routes.serviceWorker.route, serviceWorker);
    app.post(routes.logbook.jumps.imageShare.route, imageShareFallback);
}
