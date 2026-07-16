export interface JumpImageDraft {
    id: string;
    file: File;
}

interface StoredJumpImage {
    id: string;
    blob: Blob;
    name: string;
    type: string;
    lastModified: number;
}

interface StoredJumpImages {
    images: StoredJumpImage[];
    selectedId: string | null;
}

export function $appendJumpImageDrafts(config: {
    files: File[];
    dbName: string;
    storeName: string;
    storageKey: string;
}): Promise<JumpImageDraft[]> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(config.dbName, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(config.storeName)) {
                db.createObjectStore(config.storeName);
            }
        };
        request.onerror = () =>
            reject(request.error ?? new Error("Failed to open IndexedDB"));
        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(config.storeName, "readwrite");
            const store = tx.objectStore(config.storeName);
            const getRequest = store.get(config.storageKey);
            let appended: JumpImageDraft[] = [];
            getRequest.onsuccess = () => {
                const current = getRequest.result;
                let images: StoredJumpImage[] = [];
                if (Array.isArray(current?.images)) {
                    images = current.images;
                } else if (current?.blob instanceof Blob) {
                    images = [
                        {
                            id: crypto.randomUUID(),
                            blob: current.blob,
                            name: current.name ?? "jump-image.jpg",
                            type: current.type ?? current.blob.type,
                            lastModified: current.lastModified ?? Date.now(),
                        },
                    ];
                }
                appended = config.files.map((file) => ({
                    id: crypto.randomUUID(),
                    file,
                }));
                const newImages = appended.map((draft) => ({
                    id: draft.id,
                    blob: draft.file,
                    name: draft.file.name,
                    type: draft.file.type,
                    lastModified: draft.file.lastModified,
                }));
                store.put(
                    {
                        images: [...images, ...newImages],
                        selectedId:
                            appended[0]?.id ?? current?.selectedId ?? null,
                    },
                    config.storageKey,
                );
            };
            tx.oncomplete = () => {
                db.close();
                resolve(appended);
            };
            tx.onerror = () => {
                db.close();
                reject(tx.error ?? new Error("Failed to append image drafts"));
            };
        };
    });
}

export function $loadJumpImageDrafts(
    dbName: string,
    storeName: string,
    storageKey: string,
): Promise<{ drafts: JumpImageDraft[]; selectedId: string | null }> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName);
            }
        };
        request.onerror = () =>
            reject(request.error ?? new Error("Failed to open IndexedDB"));
        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(storeName, "readwrite");
            const store = tx.objectStore(storeName);
            const getRequest = store.get(storageKey);
            getRequest.onsuccess = () => {
                db.close();
                const value = getRequest.result;
                const records: StoredJumpImage[] = Array.isArray(value?.images)
                    ? value.images
                    : value?.blob instanceof Blob
                      ? [
                            {
                                id: crypto.randomUUID(),
                                blob: value.blob,
                                name: value.name ?? "jump-image.jpg",
                                type: value.type ?? value.blob.type,
                                lastModified: value.lastModified ?? Date.now(),
                            },
                        ]
                      : [];
                const drafts = records
                    .filter((record) => record.blob instanceof Blob)
                    .map((record) => ({
                        id: record.id,
                        file: new File(
                            [record.blob],
                            record.name || "jump-image.jpg",
                            {
                                type:
                                    record.type ||
                                    record.blob.type ||
                                    "image/jpeg",
                                lastModified: record.lastModified ?? Date.now(),
                            },
                        ),
                    }));
                if (value?.blob instanceof Blob && records[0]) {
                    store.put(
                        {
                            images: records,
                            selectedId: records[0].id,
                        },
                        storageKey,
                    );
                }
                resolve({
                    drafts,
                    selectedId:
                        typeof value?.selectedId === "string"
                            ? value.selectedId
                            : (drafts[0]?.id ?? null),
                });
            };
            getRequest.onerror = () => {
                db.close();
                reject(
                    getRequest.error ??
                        new Error("Failed to load image drafts"),
                );
            };
        };
    });
}

export function $updateJumpImageDrafts(config: {
    dbName: string;
    storeName: string;
    storageKey: string;
    selectedId: string | null;
    deletedId?: string;
}): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(config.dbName, 1);
        request.onerror = () =>
            reject(request.error ?? new Error("Failed to open IndexedDB"));
        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(config.storeName, "readwrite");
            const store = tx.objectStore(config.storeName);
            const getRequest = store.get(config.storageKey);
            getRequest.onsuccess = () => {
                const current: StoredJumpImages | undefined = getRequest.result;
                const images = Array.isArray(current?.images)
                    ? current.images.filter(
                          (image) => image.id !== config.deletedId,
                      )
                    : [];
                if (images.length === 0) {
                    store.delete(config.storageKey);
                    return;
                }
                store.put(
                    { images, selectedId: config.selectedId },
                    config.storageKey,
                );
            };
            tx.oncomplete = () => {
                db.close();
                resolve();
            };
            tx.onerror = () => {
                db.close();
                reject(tx.error ?? new Error("Failed to update image drafts"));
            };
        };
    });
}
