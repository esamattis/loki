import { useAppContext } from "@/app/app";
import { Script } from "@/components/script";
import { $idb, $select } from "@/utils";
import {
    $loadImage,
    jumpImageDbName,
} from "@/route-handlers/logbook/jumps/image-storage-client";

/** Stable DOM id for a draft image; must not use useId() (HTMX fragments collide). */
export function jumpImageElementId(imageId: string): string {
    return `loki-jump-image-${imageId}`;
}

export function JumpImage(props: {
    imageId: string;
    alt: string;
    className?: string;
    revealElementId?: string;
}) {
    const elementId = jumpImageElementId(props.imageId);
    const dbName = jumpImageDbName(useAppContext().getUser().uuid);

    return (
        <>
            <img id={elementId} className={props.className} alt={props.alt} />
            <Script
                $deps={[$idb, $select, $loadImage]}
                $args={[
                    {
                        elementId,
                        imageId: props.imageId,
                        dbName,
                        revealElementId: props.revealElementId ?? null,
                    },
                ]}
                $exec={$loadJumpImageElement}
            />
        </>
    );
}

function $loadJumpImageElement(config: {
    elementId: string;
    imageId: string;
    dbName: string;
    revealElementId: string | null;
}) {
    const image = $select.id(config.elementId, HTMLImageElement);
    void $loadImage(config.imageId, config.dbName)
        .then((draft) => {
            if (!draft) {
                return;
            }
            const url = URL.createObjectURL(draft.file);
            image.src = url;
            if (config.revealElementId) {
                $select
                    .id(config.revealElementId, HTMLElement)
                    .classList.remove("hidden");
            }
            // Bubbles to ImageGallery listeners so they can enrich items with
            // IndexedDB-only draft metadata after the blob URL is set.
            image.dispatchEvent(
                new CustomEvent("loki:jump-image-loaded", {
                    bubbles: true,
                    detail: draft,
                }),
            );
            function revokeUrl() {
                URL.revokeObjectURL(url);
            }
            image.addEventListener("htmx:beforeCleanupElement", revokeUrl, {
                once: true,
            });
            window.addEventListener("pagehide", revokeUrl, { once: true });
        })
        .catch((error) => {
            console.error("Failed to load the jump image", error);
        });
}
