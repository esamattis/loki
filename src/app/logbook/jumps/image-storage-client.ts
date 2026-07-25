import { $idb } from "@/utils";

export const JUMP_IMAGE_DB_NAME = "loki-jump-from-image";
export const JUMP_IMAGE_STORE = "images";
export const JUMP_IMAGE_KEY = "draft";

export function jumpImageDbName(userUuid: string): string {
    return `${JUMP_IMAGE_DB_NAME}:${userUuid}`;
}

export interface JumpImageDraft {
    id: string;
    file: File;
    read: boolean;
    createdJumps: CreatedJump[];
}

export interface CreatedJump {
    uuid: string;
    jumpNumber: number;
}

export interface StoredJumpImage {
    id: string;
    blob: Blob;
    name: string;
    type: string;
    lastModified: number;
    read?: boolean;
    createdJumps?: CreatedJump[];
}

export interface StoredJumpImages {
    images: StoredJumpImage[];
    selectedId: string | null;
}

export async function $appendJumpImageDrafts(
    config: {
        files: File[];
        dbName: string;
        storeName: string;
        storageKey: string;
    },
    idb: typeof $idb,
): Promise<JumpImageDraft[]> {
    const db = await idb.open(config.dbName, 1, (database) => {
        if (!database.objectStoreNames.contains(config.storeName)) {
            database.createObjectStore(config.storeName);
        }
    });
    return idb
        .transaction(
            db,
            { storeName: config.storeName, mode: "readwrite" },
            async (store) => {
                const current = await idb.request(store.get(config.storageKey));
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
                const appended = [...config.files].reverse().map((file) => ({
                    id: crypto.randomUUID(),
                    file,
                    read: false,
                    createdJumps: [],
                }));
                const newImages = appended.map((draft) => ({
                    id: draft.id,
                    blob: draft.file,
                    name: draft.file.name,
                    type: draft.file.type,
                    lastModified: draft.file.lastModified,
                    read: draft.read,
                    createdJumps: draft.createdJumps,
                }));
                await idb.request(
                    store.put(
                        {
                            images: [...newImages, ...images],
                            selectedId:
                                appended[0]?.id ?? current?.selectedId ?? null,
                        },
                        config.storageKey,
                    ),
                );
                return appended;
            },
        )
        .finally(() => db.close());
}

export async function $loadImage(
    id: string,
    dbName: string,
): Promise<JumpImageDraft | null> {
    const storeName = "images";
    const storageKey = "draft";
    const db = await $idb.open(dbName, 1);
    return $idb
        .transaction(db, { storeName, mode: "readonly" }, async (store) => {
            const value = await $idb.request(store.get(storageKey));
            const record: StoredJumpImage | undefined = Array.isArray(
                value?.images,
            )
                ? value.images.find((image: StoredJumpImage) => image.id === id)
                : undefined;
            if (!record || !(record.blob instanceof Blob)) {
                return null;
            }
            return {
                id: record.id,
                file: new File([record.blob], record.name || "jump-image.jpg", {
                    type: record.type || record.blob.type || "image/jpeg",
                    lastModified: record.lastModified ?? Date.now(),
                }),
                read: record.read === true,
                createdJumps: Array.isArray(record.createdJumps)
                    ? record.createdJumps
                    : [],
            };
        })
        .finally(() => db.close());
}

export function $markImageRead(id: string, dbName: string): Promise<void> {
    return $updateJumpImageDrafts({
        dbName,
        storeName: "images",
        storageKey: "draft",
        selectedId: id,
        readId: id,
    });
}

export async function $loadJumpImageDrafts(
    dbName: string,
    storeName: string,
    storageKey: string,
): Promise<{ drafts: JumpImageDraft[]; selectedId: string | null }> {
    const db = await $idb.open(dbName, 1, (database) => {
        if (!database.objectStoreNames.contains(storeName)) {
            database.createObjectStore(storeName);
        }
    });
    return $idb
        .transaction(db, { storeName, mode: "readwrite" }, async (store) => {
            const value = await $idb.request(store.get(storageKey));
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
            if (value?.blob instanceof Blob && records[0]) {
                await $idb.request(
                    store.put(
                        {
                            images: records,
                            selectedId: records[0].id,
                        },
                        storageKey,
                    ),
                );
            }
            const drafts = records
                .filter((record) => record.blob instanceof Blob)
                .map((record) => ({
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
                    createdJumps: Array.isArray(record.createdJumps)
                        ? record.createdJumps
                        : [],
                }));
            return {
                drafts,
                selectedId:
                    typeof value?.selectedId === "string"
                        ? value.selectedId
                        : (drafts[0]?.id ?? null),
            };
        })
        .finally(() => db.close());
}

export async function $updateJumpImageDrafts(config: {
    dbName: string;
    storeName: string;
    storageKey: string;
    selectedId: string | null;
    deletedId?: string;
    readId?: string;
    clearAll?: boolean;
}): Promise<void> {
    const db = await $idb.open(config.dbName, 1);
    return $idb
        .transaction(
            db,
            { storeName: config.storeName, mode: "readwrite" },
            async (store) => {
                if (config.clearAll) {
                    await $idb.request(store.delete(config.storageKey));
                    return;
                }
                const current: StoredJumpImages | undefined =
                    await $idb.request(store.get(config.storageKey));
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
                    await $idb.request(store.delete(config.storageKey));
                    return;
                }
                await $idb.request(
                    store.put(
                        { images, selectedId: config.selectedId },
                        config.storageKey,
                    ),
                );
            },
        )
        .finally(() => db.close());
}
