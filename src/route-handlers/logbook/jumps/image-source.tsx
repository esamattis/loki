import { useId } from "hono/jsx";
import { Script } from "@/components/script";
import { $assertElement } from "@/utils";
import {
    $loadImage,
    $markImageRead,
    $updateJumpImageDrafts,
} from "@/route-handlers/logbook/jumps/image-storage-client";

export function JumpImageSource(props: { imageId: string }) {
    const containerId = useId();
    const imageId = useId();

    return (
        <section
            id={containerId}
            className="hidden space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Values read from this image
            </h2>
            <img
                id={imageId}
                className="max-h-96 w-full rounded-lg bg-slate-100 object-contain dark:bg-slate-950"
                alt="Image used to read jump values"
            />
            <Script
                $deps={[
                    $assertElement,
                    $loadImage,
                    $markImageRead,
                    $updateJumpImageDrafts,
                ]}
                $args={[props.imageId, containerId, imageId]}
                $exec={$showJumpImageSource}
            />
        </section>
    );
}

function $showJumpImageSource(
    storedImageId: string,
    containerId: string,
    imageId: string,
) {
    const container = document.getElementById(containerId);
    const image = document.getElementById(imageId);
    $assertElement(container, HTMLElement);
    $assertElement(image, HTMLImageElement);
    void $markImageRead(storedImageId).catch((error) => {
        console.error("Failed to mark the source jump image as read", error);
    });
    void $loadImage(storedImageId)
        .then((draft) => {
            if (!draft) {
                return;
            }
            const url = URL.createObjectURL(draft.file);
            image.src = url;
            container.classList.remove("hidden");
            window.addEventListener(
                "pagehide",
                () => URL.revokeObjectURL(url),
                {
                    once: true,
                },
            );
        })
        .catch((error) => {
            console.error("Failed to load the source jump image", error);
        });
}
