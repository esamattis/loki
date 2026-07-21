import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { DangerZone } from "@/components/ui/danger-zone";

export function DangerZoneSection() {
    return (
        <div id="danger-zone" className="scroll-mt-4">
            <DangerZone>
                <div className="space-y-3">
                    <p className="text-sm text-red-700/90 dark:text-red-300/90">
                        Permanently delete all jumps and jump items, including
                        gear, locations, aircraft, and jump types. Your account
                        and preferences will remain. This cannot be undone.
                    </p>
                    <ConfirmDeleteButton
                        label="Delete logbook data"
                        action="delete-logbook-data"
                    />
                </div>
                <div className="mt-5 space-y-3 border-t border-red-200 pt-5 dark:border-red-900/60">
                    <p className="text-sm text-red-700/90 dark:text-red-300/90">
                        Permanently delete your account and all logbook data.
                        This cannot be undone.
                    </p>
                    <ConfirmDeleteButton label="Delete account" />
                </div>
            </DangerZone>
        </div>
    );
}
