import { Script } from "@/components/script";
import { useAppContext } from "@/app/app";
import { $idb } from "@/utils";
import {
    $applyImageJumpAssociationChange,
    $updateImageJumpAssociation,
    type ImageJumpAssociationChange,
} from "@/route-handlers/logbook/jumps/image-jump-storage-client";
import { jumpImageDbName } from "@/route-handlers/logbook/jumps/image-storage-client";
import {
    $completeReturnAfterFormPost,
    returnAfterFormPostStorage,
} from "@/components/return-after-form-post";

export function JumpImageAssociationComplete(props: {
    change: ImageJumpAssociationChange;
    redirectUrl: string;
    returnAfterFormPost?: boolean;
}) {
    const dbName = jumpImageDbName(useAppContext().getUser().uuid);

    return (
        <main className="mx-auto max-w-lg p-6 text-slate-700 dark:text-slate-200">
            <p>Updating source image links in this browser...</p>
            <p className="mt-3">
                <a className="font-medium underline" href={props.redirectUrl}>
                    Continue to logbook
                </a>
            </p>
            <Script
                $deps={[
                    $idb,
                    $applyImageJumpAssociationChange,
                    $updateImageJumpAssociation,
                    $completeReturnAfterFormPost,
                ]}
                $args={[
                    {
                        change: props.change,
                        redirectUrl: props.redirectUrl,
                        dbName,
                        returnAfterFormPost: props.returnAfterFormPost,
                        returnAfterFormPostStorage,
                    },
                ]}
                $exec={async (config) => {
                    try {
                        await $updateImageJumpAssociation(
                            config.change,
                            config.dbName,
                        );
                    } catch (error) {
                        console.error(
                            "Failed to update the source image association",
                            error,
                        );
                    }
                    // Jump edits cannot redirect on the server because this
                    // browser-side association update must finish first.
                    if (config.returnAfterFormPost) {
                        $completeReturnAfterFormPost(
                            config.redirectUrl,
                            config.returnAfterFormPostStorage,
                        );
                    } else {
                        window.location.replace(config.redirectUrl);
                    }
                }}
            />
        </main>
    );
}
