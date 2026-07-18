import { Script } from "@/components/script";
import {
    $applyImageJumpAssociationChange,
    $updateImageJumpAssociation,
    type ImageJumpAssociationChange,
} from "@/route-handlers/logbook/jumps/image-jump-storage-client";

export function JumpImageAssociationComplete(props: {
    change: ImageJumpAssociationChange;
    redirectUrl: string;
}) {
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
                    $applyImageJumpAssociationChange,
                    $updateImageJumpAssociation,
                ]}
                $args={[
                    {
                        change: props.change,
                        redirectUrl: props.redirectUrl,
                    },
                ]}
                $exec={async (config) => {
                    try {
                        await $updateImageJumpAssociation(config.change);
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
