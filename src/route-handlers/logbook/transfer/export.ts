import { eq, sql } from "drizzle-orm";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import * as routes from "@/routes";
import {
    aircrafts,
    gear,
    jumps,
    jumpsToAircrafts,
    jumpsToGear,
    jumpsToJumpTypes,
    jumpTypes,
    locations,
} from "@/schema";

const CSV_HEADERS = [
    "type",
    "name",
    "previousCount",
    "jumpNumber",
    "jumpDate",
    "exitAltitude",
    "openingAltitude",
    "freefallTime",
    "location",
    "aircraft",
    "gear",
    "jumpTypes",
    "description",
] as const;

type ExportNamedResource = {
    type: "aircraft" | "gear" | "jumpType" | "location";
    name: string;
    previousCount: number;
    description: string | null;
};

type ExportJump = {
    type: "jump";
    jumpNumber: number;
    jumpDate: string | null;
    exitAltitude: number;
    openingAltitude: number;
    freefallTime: number;
    location: string;
    aircraft: string[];
    gear: string[];
    jumpTypes: string[];
    description: string | null;
};

type ExportRecord = ExportNamedResource | ExportJump;

function escapeCsvField(value: string | number | null): string {
    if (value === null) {
        return "";
    }
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function joinCsvList(values: string[]): string {
    return values.map((value) => value.replaceAll(";", ";;")).join("; ");
}

function formatExportCsv(records: ExportRecord[]): string {
    const rows = records.map((record) =>
        record.type === "jump"
            ? [
                  record.type,
                  "",
                  "",
                  record.jumpNumber,
                  record.jumpDate,
                  record.exitAltitude,
                  record.openingAltitude,
                  record.freefallTime,
                  record.location,
                  joinCsvList(record.aircraft),
                  joinCsvList(record.gear),
                  joinCsvList(record.jumpTypes),
                  record.description,
              ]
            : [
                  record.type,
                  record.name,
                  record.previousCount,
                  "",
                  "",
                  "",
                  "",
                  "",
                  "",
                  "",
                  "",
                  "",
                  record.description,
              ],
    );
    return (
        [CSV_HEADERS, ...rows]
            .map((row) => row.map(escapeCsvField).join(","))
            .join("\n") + "\n"
    );
}

function buildExportFilename(displayName: string, date = new Date()): string {
    const slug =
        displayName
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "user";
    return `loki-${slug}-${date.toISOString().slice(0, 19).replace(/:/g, "")}Z.csv`;
}

async function recordCsvExport(c: AppRequestContext) {
    await getAppContext(c).getUser().updateOptions({
        lastCsvExportAt: new Date().toISOString(),
    });
}

export async function exportLogbook(c: AppRequestContext) {
    const context = getAppContext(c);
    const user = context.getUser();
    const [
        aircraftRows,
        gearRows,
        jumpTypeRows,
        locationRows,
        jumpRows,
        jumpAircraftRows,
        jumpGearRows,
        jumpTypeRelationRows,
    ] = await Promise.all([
        context.db
            .select()
            .from(aircrafts)
            .where(eq(aircrafts.userUuid, user.uuid))
            .orderBy(aircrafts.name),
        context.db
            .select()
            .from(gear)
            .where(eq(gear.userUuid, user.uuid))
            .orderBy(gear.name),
        context.db
            .select()
            .from(jumpTypes)
            .where(eq(jumpTypes.userUuid, user.uuid))
            .orderBy(jumpTypes.name),
        context.db
            .select()
            .from(locations)
            .where(eq(locations.userUuid, user.uuid))
            .orderBy(locations.name),
        context.db
            .select({
                uuid: jumps.uuid,
                jumpNumber: jumps.jumpNumber,
                jumpDate: jumps.jumpDate,
                exitAltitude: jumps.exitAltitude,
                openingAltitude: jumps.openingAltitude,
                freefallTime: jumps.freefallTime,
                description: jumps.description,
                location: sql<string>`coalesce(${locations.name}, '')`,
            })
            .from(jumps)
            .leftJoin(locations, eq(jumps.locationUuid, locations.uuid))
            .where(eq(jumps.userUuid, user.uuid))
            .orderBy(jumps.jumpNumber),
        context.db
            .select({
                jumpUuid: jumpsToAircrafts.jumpUuid,
                name: aircrafts.name,
            })
            .from(jumpsToAircrafts)
            .innerJoin(
                aircrafts,
                eq(jumpsToAircrafts.aircraftUuid, aircrafts.uuid),
            )
            .innerJoin(jumps, eq(jumpsToAircrafts.jumpUuid, jumps.uuid))
            .where(eq(jumps.userUuid, user.uuid)),
        context.db
            .select({ jumpUuid: jumpsToGear.jumpUuid, name: gear.name })
            .from(jumpsToGear)
            .innerJoin(gear, eq(jumpsToGear.gearUuid, gear.uuid))
            .innerJoin(jumps, eq(jumpsToGear.jumpUuid, jumps.uuid))
            .where(eq(jumps.userUuid, user.uuid)),
        context.db
            .select({
                jumpUuid: jumpsToJumpTypes.jumpUuid,
                name: jumpTypes.name,
            })
            .from(jumpsToJumpTypes)
            .innerJoin(
                jumpTypes,
                eq(jumpsToJumpTypes.jumpTypeUuid, jumpTypes.uuid),
            )
            .innerJoin(jumps, eq(jumpsToJumpTypes.jumpUuid, jumps.uuid))
            .where(eq(jumps.userUuid, user.uuid)),
    ]);
    const aircraftsByJump = new Map<string, string[]>();
    const gearByJump = new Map<string, string[]>();
    const jumpTypesByJump = new Map<string, string[]>();
    for (const row of jumpAircraftRows) {
        aircraftsByJump.set(row.jumpUuid, [
            ...(aircraftsByJump.get(row.jumpUuid) ?? []),
            row.name,
        ]);
    }
    for (const row of jumpGearRows) {
        gearByJump.set(row.jumpUuid, [
            ...(gearByJump.get(row.jumpUuid) ?? []),
            row.name,
        ]);
    }
    for (const row of jumpTypeRelationRows) {
        jumpTypesByJump.set(row.jumpUuid, [
            ...(jumpTypesByJump.get(row.jumpUuid) ?? []),
            row.name,
        ]);
    }
    const records: ExportRecord[] = [
        ...aircraftRows.map((row) => ({
            type: "aircraft" as const,
            name: row.name,
            previousCount: row.previousJumpCount,
            description: row.description,
        })),
        ...gearRows.map((row) => ({
            type: "gear" as const,
            name: row.name,
            previousCount: row.previousUsageCount,
            description: row.description,
        })),
        ...jumpTypeRows.map((row) => ({
            type: "jumpType" as const,
            name: row.name,
            previousCount: row.previousUsageCount,
            description: row.description,
        })),
        ...locationRows.map((row) => ({
            type: "location" as const,
            name: row.name,
            previousCount: row.previousJumpCount,
            description: row.description,
        })),
        ...jumpRows.map((row) => ({
            type: "jump" as const,
            jumpNumber: row.jumpNumber,
            jumpDate: row.jumpDate,
            exitAltitude: row.exitAltitude,
            openingAltitude: row.openingAltitude,
            freefallTime: row.freefallTime,
            location: row.location,
            aircraft: aircraftsByJump.get(row.uuid) ?? [],
            gear: gearByJump.get(row.uuid) ?? [],
            jumpTypes: jumpTypesByJump.get(row.uuid) ?? [],
            description: row.description,
        })),
    ];
    const filename = buildExportFilename(user.getDisplayName());
    await recordCsvExport(c);
    return c.body(formatExportCsv(records), 200, {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "text/csv; charset=utf-8",
    });
}

export function register(app: App) {
    app.get(routes.logbook.transfer.export.route, exportLogbook);
}
