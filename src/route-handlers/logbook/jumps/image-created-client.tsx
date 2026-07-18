import { Script } from "@/components/script";
import { useAppContext } from "@/app/app";
import { $idb } from "@/utils";
import {
    $applyImageJumpAssociationChange,
    $updateImageJumpAssociation,
    type ImageJumpAssociationChange,
} from "@/route-handlers/logbook/jumps/image-jump-storage-client";
import {
    $migrateLegacyJumpImageDatabase,
    jumpImageDbName,
} from "@/route-handlers/logbook/jumps/image-storage-client";

export function JumpImageAssociationComplete(props: {
    change: ImageJumpAssociationChange;
    redirectUrl: string;
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
                    $migrateLegacyJumpImageDatabase,
                    $updateImageJumpAssociation,
                ]}
                $args={[
                    {
                        change: props.change,
                        redirectUrl: props.redirectUrl,
                        dbName,
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
                    window.location.replace(config.redirectUrl);
                }}
            />
        </main>
    );
}
