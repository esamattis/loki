import { useId } from "hono/jsx";
import { useAppContext } from "@/app/app";
import { Script } from "@/components/script";
import { $idb, $select } from "@/utils";
import {
    $loadImage,
    $loadJumpImageDrafts,
    $markImageRead,
    $migrateLegacyJumpImageDatabase,
    $updateJumpImageDrafts,
    jumpImageDbName,
} from "@/route-handlers/logbook/jumps/image-storage-client";
import { $loadImageForJump } from "@/route-handlers/logbook/jumps/image-jump-storage-client";

export function JumpImageSource(props: {
    imageId?: string;
    jumpUuid?: string;
    title: string;
    formId?: string;
}) {
    const dbName = jumpImageDbName(useAppContext().getUser().uuid);
    const containerId = useId();
    const imageId = useId();

    return (
        <section
            id={containerId}
            className="hidden space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
            {props.imageId && props.formId && (
                <input
                    type="hidden"
                    name="sourceImageId"
                    value={props.imageId}
                    form={props.formId}
                />
            )}
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {props.title}
            </h2>
            <img
                id={imageId}
                className="max-h-96 w-full rounded-lg bg-slate-100 object-contain dark:bg-slate-950"
                alt="Image used to read jump values"
            />
            <p className="text-sm text-slate-500 dark:text-slate-400">
                This image is stored and shown only in this device.
            </p>
            <Script
                $deps={[
                    $idb,
                    $select,
                    $loadImage,
                    $loadJumpImageDrafts,
                    $loadImageForJump,
                    $markImageRead,
                    $migrateLegacyJumpImageDatabase,
                    $updateJumpImageDrafts,
                ]}
                $args={[
                    {
                        storedImageId: props.imageId ?? null,
                        jumpUuid: props.jumpUuid ?? null,
                        containerId,
                        imageId,
                        dbName,
                    },
                ]}
                $exec={$showJumpImageSource}
            />
        </section>
    );
}

function $showJumpImageSource(config: {
    storedImageId: string | null;
    jumpUuid: string | null;
    containerId: string;
    imageId: string;
    dbName: string;
}) {
    const container = $select.id(config.containerId, HTMLElement);
    const image = $select.id(config.imageId, HTMLImageElement);
    if (config.storedImageId) {
        void $markImageRead(config.storedImageId, config.dbName).catch(
            (error) => {
                console.error(
                    "Failed to mark the source jump image as read",
                    error,
                );
            },
        );
    }
    const loadImage = config.storedImageId
        ? $loadImage(config.storedImageId, config.dbName)
        : config.jumpUuid
          ? $loadImageForJump(config.jumpUuid, config.dbName)
          : Promise.resolve(null);
    void loadImage
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
