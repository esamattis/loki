import type { AppDatabase } from "@/db";
import { aircrafts, gear, jumpTypes, locations } from "@/schema";

const DEFAULT_AIRCRAFT = [
    { name: "Cessna Caravan", description: "Aircraft type" },
    { name: "OH-DZF", description: "Aircraft registration" },
    { name: "Cessna 182", description: "Aircraft type" },
    { name: "OH-AIK", description: "Aircraft registration" },
    { name: "Cessna 206", description: "Aircraft type" },
    { name: "OH-ARR", description: "Aircraft registration" },
];

const DEFAULT_LOCATIONS = [
    { name: "EFUT", description: "Utti Airfield" },
    { name: "EFJY", description: "Jyvaskyla Airport" },
    { name: "EFAL", description: "Alavus Airfield" },
    { name: "EFSE", description: "Selanpaa Airfield" },
    { name: "EFLP", description: "Lappeenranta Airport" },
];

const DEFAULT_GEAR = [
    { name: "PD Navigator", description: "Student main canopy" },
    { name: "PD Sabre 2", description: "Sport main canopy" },
    { name: "SQRL Freak 5", description: "Wingsuit" },
];

const DEFAULT_JUMP_TYPES = [
    { name: "Cutaway", description: "Main canopy cutaway" },
    { name: "FS", description: "Formation skydiving" },
    { name: "Static Line", description: "Static-line jump" },
    { name: "Wingsuit", description: "Wingsuit flight" },
    { name: "Freefly", description: "Freeflying" },
    { name: "AFF", description: "Accelerated freefall" },
];

export async function createDefaultJumpItems(
    db: AppDatabase,
    userUuid: string,
) {
    function withUserUuid(items: { name: string; description: string }[]) {
        return items.map((item) => ({ ...item, userUuid }));
    }

    await Promise.all([
        db.insert(aircrafts).values(withUserUuid(DEFAULT_AIRCRAFT)).run(),
        db.insert(locations).values(withUserUuid(DEFAULT_LOCATIONS)).run(),
        db.insert(gear).values(withUserUuid(DEFAULT_GEAR)).run(),
        db.insert(jumpTypes).values(withUserUuid(DEFAULT_JUMP_TYPES)).run(),
    ]);
}
