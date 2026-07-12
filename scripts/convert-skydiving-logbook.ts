import { readFile, writeFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";

type ResourceType = "aircraft" | "gear" | "jumpType" | "location";

interface ImportResource {
    type: ResourceType;
    name: string;
    previousCount: number;
}

interface ImportJump {
    type: "jump";
    jumpNumber: number;
    exitAltitude: number;
    openingAltitude: number;
    freefallTime: number;
    location: string;
    aircraft: string;
    gear: string[];
    jumpTypes: string[];
    description?: string;
}

type ImportRecord = ImportResource | ImportJump;

interface ResourceCatalog {
    records: ImportResource[];
    namesById: Map<string, string>;
}

function asObject(value: unknown, label: string): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`${label} is missing or invalid`);
    }
    const record: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
        record[key] = item;
    }
    return record;
}

function asItems(value: unknown): unknown[] {
    return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function stringField(
    record: Record<string, unknown>,
    field: string,
): string | undefined {
    const value = record[field];
    return typeof value === "string" ? value.trim() || undefined : undefined;
}

function requiredStringField(
    record: Record<string, unknown>,
    field: string,
): string {
    const value = stringField(record, field);
    if (!value) {
        throw new Error(`Missing ${field}`);
    }
    return value;
}

function numberField(
    record: Record<string, unknown>,
    field: string,
    minimum: number,
): number {
    const value = Number(stringField(record, field));
    if (!Number.isInteger(value) || value < minimum) {
        throw new Error(
            `${field} must be a whole number of at least ${minimum}`,
        );
    }
    return value;
}

function createCatalog(
    value: unknown,
    itemName: string,
    type: ResourceType,
): ResourceCatalog {
    const records: ImportResource[] = [];
    const namesById = new Map<string, string>();
    const names = new Set<string>();

    for (const item of asItems(asObject(value, itemName)[itemName])) {
        const record = asObject(item, itemName);
        const id = requiredStringField(record, "id");
        const name = requiredStringField(record, "name");
        namesById.set(id, name);
        if (!names.has(name)) {
            records.push({
                type,
                name,
                previousCount: stringField(record, "previous_jump_count")
                    ? numberField(record, "previous_jump_count", 0)
                    : 0,
            });
            names.add(name);
        }
    }

    return { records, namesById };
}

function resolveNames(
    ids: string[],
    catalog: ResourceCatalog,
    resourceName: string,
    errors: string[],
    jumpNumber: number,
): string[] {
    return ids.flatMap((id) => {
        const name = catalog.namesById.get(id);
        if (name) {
            return [name];
        }
        errors.push(
            `Jump #${jumpNumber}: unknown ${resourceName} ID ${JSON.stringify(id)}`,
        );
        return [];
    });
}

function rigIds(record: Record<string, unknown>): string[] {
    const rigs = record.rigs;
    if (rigs === undefined) {
        return [];
    }
    return asItems(asObject(rigs, "rigs").rig_id).flatMap((value) =>
        typeof value === "string" && value.trim() ? [value.trim()] : [],
    );
}

function createJumps(
    value: unknown,
    locations: ResourceCatalog,
    aircraft: ResourceCatalog,
    gear: ResourceCatalog,
    jumpTypes: ResourceCatalog,
): {
    jumps: ImportJump[];
    needsUnknownLocation: boolean;
    needsUnknownAircraft: boolean;
} {
    const jumps: ImportJump[] = [];
    const errors: string[] = [];
    let needsUnknownLocation = false;
    let needsUnknownAircraft = false;

    for (const item of asItems(asObject(value, "log_entries").log_entry)) {
        const record = asObject(item, "log_entry");
        const jumpNumber = numberField(record, "jump_number", 1);
        const locationIds = stringField(record, "location_id");
        const aircraftIds = stringField(record, "aircraft_id");
        const location = locationIds
            ? resolveNames(
                  [locationIds],
                  locations,
                  "location",
                  errors,
                  jumpNumber,
              )[0]
            : "Unknown location";
        const aircraftName = aircraftIds
            ? resolveNames(
                  [aircraftIds],
                  aircraft,
                  "aircraft",
                  errors,
                  jumpNumber,
              )[0]
            : "Unknown aircraft";

        if (!location) {
            continue;
        }
        if (!aircraftName) {
            continue;
        }
        if (!locationIds) {
            needsUnknownLocation = true;
        }
        if (!aircraftIds) {
            needsUnknownAircraft = true;
        }

        const jump: ImportJump = {
            type: "jump",
            jumpNumber,
            exitAltitude: numberField(record, "exit_altitude", 1),
            openingAltitude: numberField(record, "deployment_altitude", 0),
            freefallTime: numberField(record, "freefall_time", 0),
            location,
            aircraft: aircraftName,
            gear: resolveNames(rigIds(record), gear, "rig", errors, jumpNumber),
            jumpTypes: resolveNames(
                stringField(record, "skydive_type_id")
                    ? [requiredStringField(record, "skydive_type_id")]
                    : [],
                jumpTypes,
                "skydive type",
                errors,
                jumpNumber,
            ),
        };
        const description = stringField(record, "notes");
        if (description) {
            jump.description = description;
        }
        jumps.push(jump);
    }

    if (errors.length > 0) {
        throw new Error(errors.join("\n"));
    }
    return { jumps, needsUnknownLocation, needsUnknownAircraft };
}

function createRecords(xml: string): ImportRecord[] {
    const parser = new XMLParser({ parseTagValue: false, trimValues: false });
    const parsed = asObject(parser.parse(xml), "XML document");
    const logbook = asObject(parsed.skydiving_logbook, "skydiving_logbook");
    const locations = createCatalog(logbook.locations, "location", "location");
    const aircraft = createCatalog(logbook.aircrafts, "aircraft", "aircraft");
    const gear = createCatalog(logbook.rigs, "rig", "gear");
    const jumpTypes = createCatalog(
        logbook.skydive_types,
        "skydive_type",
        "jumpType",
    );
    const result = createJumps(
        logbook.log_entries,
        locations,
        aircraft,
        gear,
        jumpTypes,
    );

    return [
        ...aircraft.records,
        ...(result.needsUnknownAircraft
            ? [
                  {
                      type: "aircraft" as const,
                      name: "Unknown aircraft",
                      previousCount: 0,
                  },
              ]
            : []),
        ...gear.records,
        ...jumpTypes.records,
        ...locations.records,
        ...(result.needsUnknownLocation
            ? [
                  {
                      type: "location" as const,
                      name: "Unknown location",
                      previousCount: 0,
                  },
              ]
            : []),
        ...result.jumps,
    ];
}

async function main(): Promise<void> {
    const inputPath = process.argv[2] ?? "skydiving_logbook.xml";
    const outputPath =
        process.argv[3] ?? inputPath.replace(/\.xml$/i, ".jsonl");
    const records = createRecords(await readFile(inputPath, "utf8"));
    await writeFile(
        outputPath,
        records.map((record) => JSON.stringify(record)).join("\n") + "\n",
    );
    console.log(`Converted ${records.length} records to ${outputPath}`);
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
