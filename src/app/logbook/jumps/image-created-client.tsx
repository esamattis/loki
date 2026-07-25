import { Script } from "@/components/script";
import { useAppContext } from "@/app/app";
import { Link } from "@/components/link";
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
import * as routes from "@/routes";

function $completeJumpEditRedirect(
    redirectUrl: string,
    storage: typeof returnAfterFormPostStorage,
    logbookPath: string,
) {
    const returnRoute = sessionStorage.getItem(storage.storageKey);
    const expectedDestination = sessionStorage.getItem(
        storage.destinationStorageKey,
    );
    const currentRoute = window.location.pathname + window.location.search;
    if (returnRoute && expectedDestination === currentRoute) {
        const returnPath = new URL(returnRoute, window.location.origin)
            .pathname;
        if (returnPath !== logbookPath) {
            $completeReturnAfterFormPost(redirectUrl, storage);
            return;
        }
    }
    sessionStorage.removeItem(storage.storageKey);
    sessionStorage.removeItem(storage.destinationStorageKey);
    sessionStorage.removeItem(storage.pendingStorageKey);
    window.location.replace(redirectUrl);
}

export function JumpImageAssociationComplete(props: {
    change?: ImageJumpAssociationChange;
    changes?: ImageJumpAssociationChange[];
    redirectUrl: string;
    returnAfterFormPost?: boolean;
}) {
    const dbName = jumpImageDbName(useAppContext().getUser().uuid);
    const changes = props.changes ?? (props.change ? [props.change] : []);
    const logbookPath = routes.logbook.index({});

    return (
        <main className="mx-auto max-w-lg p-6 text-slate-700 dark:text-slate-200">
            <p>Updating source image links in this browser...</p>
            <p className="mt-3">
                <Link href={props.redirectUrl}>Continue to logbook</Link>
            </p>
            <Script
                $deps={[
                    $idb,
                    $applyImageJumpAssociationChange,
                    $updateImageJumpAssociation,
                    $completeReturnAfterFormPost,
                    $completeJumpEditRedirect,
                ]}
                $args={[
                    {
                        changes,
                        redirectUrl: props.redirectUrl,
                        dbName,
                        returnAfterFormPost: props.returnAfterFormPost,
                        returnAfterFormPostStorage,
                        logbookPath,
                    },
                ]}
                $exec={async (config) => {
                    try {
                        for (const change of config.changes) {
                            await $updateImageJumpAssociation(
                                change,
                                config.dbName,
                            );
                        }
                    } catch (error) {
                        console.error(
                            "Failed to update the source image association",
                            error,
                        );
                    }
                    // Jump edits cannot redirect on the server because this
                    // browser-side association update must finish first.
                    if (config.returnAfterFormPost) {
                        $completeJumpEditRedirect(
                            config.redirectUrl,
                            config.returnAfterFormPostStorage,
                            config.logbookPath,
                        );
                    } else {
                        window.location.replace(config.redirectUrl);
                    }
                }}
            />
        </main>
    );
}
