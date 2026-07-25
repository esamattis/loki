import { useId } from "hono/jsx";
import { useAppContext } from "@/app/app";
import { Script } from "@/components/script";
import { $idb, $select } from "@/utils";
import {
    $loadJumpImageDrafts,
    $markImageRead,
    $updateJumpImageDrafts,
    jumpImageDbName,
} from "@/route-handlers/logbook/jumps/image-storage-client";
import { $loadImageForJump } from "@/route-handlers/logbook/jumps/image-jump-storage-client";
import { JumpImage } from "@/route-handlers/logbook/jumps/image";

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
            {props.imageId ? (
                <JumpImage
                    imageId={props.imageId}
                    revealElementId={containerId}
                    className="max-h-96 w-full rounded-lg bg-slate-100 object-contain dark:bg-slate-950"
                    alt="Image used to read jump values"
                />
            ) : (
                <img
                    id={imageId}
                    className="max-h-96 w-full rounded-lg bg-slate-100 object-contain dark:bg-slate-950"
                    alt="Image used to read jump values"
                />
            )}
            <p className="text-sm text-slate-500 dark:text-slate-400">
                This image is stored and shown only in this device.
            </p>
            {props.imageId && (
                <Script
                    $deps={[$idb, $markImageRead, $updateJumpImageDrafts]}
                    $args={[props.imageId, dbName]}
                    $exec={$markJumpImageRead}
                />
            )}
            {props.jumpUuid && (
                <Script
                    $deps={[
                        $idb,
                        $select,
                        $loadJumpImageDrafts,
                        $loadImageForJump,
                    ]}
                    $args={[
                        {
                            jumpUuid: props.jumpUuid,
                            containerId,
                            imageId,
                            dbName,
                        },
                    ]}
                    $exec={$showJumpImageForJump}
                />
            )}
        </section>
    );
}

function $markJumpImageRead(imageId: string, dbName: string) {
    void $markImageRead(imageId, dbName).catch((error) => {
        console.error("Failed to mark the source jump image as read", error);
    });
}

function $showJumpImageForJump(config: {
    jumpUuid: string;
    containerId: string;
    imageId: string;
    dbName: string;
}) {
    const container = $select.id(config.containerId, HTMLElement);
    const image = $select.id(config.imageId, HTMLImageElement);
    void $loadImageForJump(config.jumpUuid, config.dbName)
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
