export interface JumpImageDraft {
    id: string;
    file: File;
    read: boolean;
}

interface StoredJumpImage {
    id: string;
    blob: Blob;
    name: string;
    type: string;
    lastModified: number;
    read?: boolean;
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
                    read: false,
                }));
                const newImages = appended.map((draft) => ({
                    id: draft.id,
                    blob: draft.file,
                    name: draft.file.name,
                    type: draft.file.type,
                    lastModified: draft.file.lastModified,
                    read: draft.read,
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

export function $loadImage(id: string): Promise<JumpImageDraft | null> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("loki-jump-from-image", 1);
        request.onerror = () =>
            reject(request.error ?? new Error("Failed to open IndexedDB"));
        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction("images", "readonly");
            const getRequest = tx.objectStore("images").get("draft");
            getRequest.onsuccess = () => {
                const value = getRequest.result;
                const record: StoredJumpImage | undefined = Array.isArray(
                    value?.images,
                )
                    ? value.images.find(
                          (image: StoredJumpImage) => image.id === id,
                      )
                    : undefined;
                if (!record || !(record.blob instanceof Blob)) {
                    resolve(null);
                    return;
                }
                resolve({
                    id: record.id,
                    file: new File(
                        [record.blob],
                        record.name || "jump-image.jpg",
                        {
                            type:
                                record.type || record.blob.type || "image/jpeg",
                            lastModified: record.lastModified ?? Date.now(),
                        },
                    ),
                    read: record.read === true,
                });
            };
            getRequest.onerror = () =>
                reject(
                    getRequest.error ?? new Error("Failed to load image draft"),
                );
            tx.oncomplete = () => db.close();
        };
    });
}

export function $markImageRead(id: string): Promise<void> {
    return $updateJumpImageDrafts({
        dbName: "loki-jump-from-image",
        storeName: "images",
        storageKey: "draft",
        selectedId: id,
        readId: id,
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
                const draftIds = records
                    .filter((record) => record.blob instanceof Blob)
                    .map((record) => record.id);
                if (value?.blob instanceof Blob && records[0]) {
                    store.put(
                        {
                            images: records,
                            selectedId: records[0].id,
                        },
                        storageKey,
                    );
                }
                void Promise.all(draftIds.map((id) => $loadImage(id))).then(
                    (loaded) => {
                        const drafts = loaded.filter(
                            (draft): draft is JumpImageDraft => draft !== null,
                        );
                        resolve({
                            drafts,
                            selectedId:
                                typeof value?.selectedId === "string"
                                    ? value.selectedId
                                    : (drafts[0]?.id ?? null),
                        });
                    },
                    reject,
                );
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
    readId?: string;
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
                    ? current.images
                          .filter((image) => image.id !== config.deletedId)
                          .map((image) =>
                              image.id === config.readId
                                  ? { ...image, read: true }
                                  : image,
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
