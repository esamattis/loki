import { Script } from "@/components/script";
import {
    $migrateLegacyJumpImageDatabase,
    JUMP_IMAGE_KEY,
    JUMP_IMAGE_STORE,
    jumpImageDbName,
} from "@/route-handlers/logbook/jumps/image-storage-client";
import { $idb } from "@/utils";

export function JumpImageDatabaseMigration(props: { userUuid: string }) {
    return (
        <Script
            $deps={[$idb, $migrateLegacyJumpImageDatabase]}
            $args={[
                {
                    dbName: jumpImageDbName(props.userUuid),
                    storeName: JUMP_IMAGE_STORE,
                    storageKey: JUMP_IMAGE_KEY,
                },
            ]}
            $exec={async (config) => {
                try {
                    await $migrateLegacyJumpImageDatabase(config, $idb);
                } catch (error) {
                    console.error(
                        "Failed to migrate the legacy jump image database",
                        error,
                    );
                }
            }}
        />
    );
}
