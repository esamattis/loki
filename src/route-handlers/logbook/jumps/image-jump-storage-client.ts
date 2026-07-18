import {
    $loadJumpImageDrafts,
    type JumpImageDraft,
    type StoredJumpImage,
    type StoredJumpImages,
} from "@/route-handlers/logbook/jumps/image-storage-client";

export type ImageJumpAssociationChange =
    | {
          action: "create";
          imageId: string;
          jumpUuid: string;
          jumpNumber: number;
      }
    | { action: "update"; jumpUuid: string; jumpNumber: number }
    | { action: "delete"; jumpUuid: string };

export function $applyImageJumpAssociationChange(
    image: StoredJumpImage,
    change: ImageJumpAssociationChange,
): StoredJumpImage {
    const createdJumps = Array.isArray(image.createdJumps)
        ? image.createdJumps
        : [];
    if (change.action === "delete") {
        return {
            ...image,
            createdJumps: createdJumps.filter(
                (jump) => jump.uuid !== change.jumpUuid,
            ),
        };
    }
    if (change.action === "update") {
        return {
            ...image,
            createdJumps: createdJumps.map((jump) =>
                jump.uuid === change.jumpUuid
                    ? { ...jump, jumpNumber: change.jumpNumber }
                    : jump,
            ),
        };
    }
    if (image.id !== change.imageId) {
        return image;
    }
    return {
        ...image,
        createdJumps: [
            ...createdJumps.filter((jump) => jump.uuid !== change.jumpUuid),
            { uuid: change.jumpUuid, jumpNumber: change.jumpNumber },
        ],
    };
}

export function $updateImageJumpAssociation(
    change: ImageJumpAssociationChange,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("loki-jump-from-image", 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains("images")) {
                db.createObjectStore("images");
            }
        };
        request.onerror = () =>
            reject(request.error ?? new Error("Failed to open IndexedDB"));
        request.onsuccess = () => {
            const db = request.result;
            let tx: IDBTransaction;
            try {
                tx = db.transaction("images", "readwrite");
            } catch (error) {
                db.close();
                reject(error);
                return;
            }
            const store = tx.objectStore("images");
            const getRequest = store.get("draft");
            getRequest.onsuccess = () => {
                const current: StoredJumpImages | undefined = getRequest.result;
                if (!Array.isArray(current?.images)) {
                    return;
                }
                const images = current.images.map((image) =>
                    $applyImageJumpAssociationChange(image, change),
                );
                store.put({ ...current, images }, "draft");
            };
            tx.oncomplete = () => {
                db.close();
                resolve();
            };
            tx.onerror = () => {
                db.close();
                reject(
                    tx.error ??
                        new Error(
                            "Failed to update the source image association",
                        ),
                );
            };
        };
    });
}

export async function $loadImageForJump(
    jumpUuid: string,
): Promise<JumpImageDraft | null> {
    const stored = await $loadJumpImageDrafts(
        "loki-jump-from-image",
        "images",
        "draft",
    );
    return (
        stored.drafts.find((draft) =>
            draft.createdJumps.some((jump) => jump.uuid === jumpUuid),
        ) ?? null
    );
}
