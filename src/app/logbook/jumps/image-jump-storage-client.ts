import {
    $loadJumpImageDrafts,
    type JumpImageDraft,
    type StoredJumpImage,
    type StoredJumpImages,
} from "@/route-handlers/logbook/jumps/image-storage-client";
import { $idb } from "@/utils";

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

export async function $updateImageJumpAssociation(
    change: ImageJumpAssociationChange,
    dbName: string,
): Promise<void> {
    const storeName = "images";
    const storageKey = "draft";
    const db = await $idb.open(dbName, 1, (database) => {
        if (!database.objectStoreNames.contains("images")) {
            database.createObjectStore("images");
        }
    });
    return $idb
        .transaction(db, { storeName, mode: "readwrite" }, async (store) => {
            const current: StoredJumpImages | undefined = await $idb.request(
                store.get(storageKey),
            );
            if (!Array.isArray(current?.images)) {
                return;
            }
            const images = current.images.map((image) =>
                $applyImageJumpAssociationChange(image, change),
            );
            await $idb.request(store.put({ ...current, images }, storageKey));
        })
        .finally(() => db.close());
}

export async function $loadImageForJump(
    jumpUuid: string,
    dbName: string,
): Promise<JumpImageDraft | null> {
    const stored = await $loadJumpImageDrafts(dbName, "images", "draft");
    return (
        stored.drafts.find((draft) =>
            draft.createdJumps.some((jump) => jump.uuid === jumpUuid),
        ) ?? null
    );
}
