import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { ImportRecord } from "@/route-handlers/logbook/transfer";

type ResourceType = Exclude<ImportRecord["type"], "jump">;

interface XmlCatalog {
    records: Exclude<ImportRecord, { type: "jump" }>[];
    namesById: Map<string, string>;
}

interface XmlCatalogConfig {
    value: unknown;
    itemName: string;
    type: ResourceType;
    label: string;
    errors: string[];
}

interface XmlCatalogs {
    locations: XmlCatalog;
    aircraft: XmlCatalog;
    gear: XmlCatalog;
    jumpTypes: XmlCatalog;
}

interface ParsedXmlJumps {
    records: Extract<ImportRecord, { type: "jump" }>[];
    needsUnknownLocation: boolean;
    needsUnknownAircraft: boolean;
    needsCutawayType: boolean;
}

function normalizeName(name: string): string {
    return name.trim().toLocaleLowerCase();
}

function addCutawayJumpType(
    jumpTypeNames: string[],
    hasCutaway: boolean,
): string[] {
    return hasCutaway &&
        !jumpTypeNames.some((name) => normalizeName(name) === "cutaway")
        ? [...jumpTypeNames, "Cutaway"]
        : jumpTypeNames;
}

function xmlObject(value: unknown, label: string): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`${label} is missing or invalid`);
    }
    return Object.fromEntries(Object.entries(value));
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function validateXml(xml: string): void {
    const result = XMLValidator.validate(xml);
    if (result !== true) {
        throw new Error(
            `Invalid XML at line ${result.err.line}, column ${result.err.col}: ${result.err.msg}`,
        );
    }
}

function xmlItems(value: unknown): unknown[] {
    return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function xmlString(
    record: Record<string, unknown>,
    field: string,
): string | undefined {
    const value = record[field];
    return typeof value === "string" ? value.trim() || undefined : undefined;
}

function xmlFieldLabel(field: string): string {
    return field.replaceAll("_", " ");
}

function requiredXmlString(record: Record<string, unknown>, field: string) {
    const value = xmlString(record, field);
    if (!value) {
        throw new Error(`${xmlFieldLabel(field)} is missing`);
    }
    return value;
}

function xmlNumber(
    record: Record<string, unknown>,
    field: string,
    minimum: number,
) {
    const value = Number(xmlString(record, field));
    if (!Number.isInteger(value) || value < minimum) {
        throw new Error(
            `${xmlFieldLabel(field)} must be a whole number of at least ${minimum}`,
        );
    }
    return value;
}

function createXmlCatalog(config: XmlCatalogConfig): XmlCatalog {
    const records: Exclude<ImportRecord, { type: "jump" }>[] = [];
    const namesById = new Map<string, string>();
    const names = new Set<string>();
    const items = xmlItems(
        xmlObject(config.value, `${config.label} catalog`)[config.itemName],
    );
    for (const [index, item] of items.entries()) {
        let record: Record<string, unknown>;
        try {
            record = xmlObject(item, "record");
        } catch (error) {
            config.errors.push(
                `${config.label} ${index + 1}: ${errorMessage(error)}`,
            );
            continue;
        }
        const name = xmlString(record, "name");
        if (!name) {
            continue;
        }
        let id: string;
        let previousCount: number;
        try {
            id = requiredXmlString(record, "id");
            previousCount = xmlString(record, "previous_jump_count")
                ? xmlNumber(record, "previous_jump_count", 0)
                : 0;
        } catch (error) {
            config.errors.push(
                `${config.label} ${index + 1}: ${errorMessage(error)}`,
            );
            continue;
        }
        namesById.set(id, name);
        if (!names.has(name)) {
            records.push({
                type: config.type,
                name,
                previousCount,
            });
            names.add(name);
        }
    }
    return { records, namesById };
}

function resolveXmlNames(config: {
    ids: string[];
    catalog: XmlCatalog;
    resourceName: string;
    errors: string[];
    jumpNumber: number;
}): string[] {
    return config.ids.flatMap((id) => {
        const name = config.catalog.namesById.get(id);
        if (name) {
            return [name];
        }
        config.errors.push(
            `Jump #${config.jumpNumber}: unknown ${config.resourceName} ID ${JSON.stringify(id)}`,
        );
        return [];
    });
}

function xmlRigIds(record: Record<string, unknown>): string[] {
    if (
        record.rigs === undefined ||
        (typeof record.rigs === "string" && !record.rigs.trim())
    ) {
        return [];
    }
    return xmlItems(xmlObject(record.rigs, "rigs").rig_id).flatMap((value) =>
        typeof value === "string" && value.trim() ? [value.trim()] : [],
    );
}

function parseXmlJumps(
    logbook: Record<string, unknown>,
    catalogs: XmlCatalogs,
    errors: string[],
): ParsedXmlJumps {
    const records: Extract<ImportRecord, { type: "jump" }>[] = [];
    let needsUnknownLocation = false;
    let needsUnknownAircraft = false;
    let needsCutawayType = false;
    const logEntries = xmlItems(
        xmlObject(logbook.log_entries, "log_entries").log_entry,
    );
    for (const [index, item] of logEntries.entries()) {
        let record: Record<string, unknown>;
        let jumpNumber: number;
        try {
            record = xmlObject(item, "log_entry");
            jumpNumber = xmlNumber(record, "jump_number", 1);
        } catch (error) {
            errors.push(`Log entry ${index + 1}: ${errorMessage(error)}`);
            continue;
        }
        const jumpLabel = `Log entry ${index + 1} (jump #${jumpNumber})`;
        const locationId = xmlString(record, "location_id");
        const aircraftId = xmlString(record, "aircraft_id");
        const location = locationId
            ? resolveXmlNames({
                  ids: [locationId],
                  catalog: catalogs.locations,
                  resourceName: "location",
                  errors,
                  jumpNumber,
              })[0]
            : "Unknown location";
        const aircraftName = aircraftId
            ? resolveXmlNames({
                  ids: [aircraftId],
                  catalog: catalogs.aircraft,
                  resourceName: "aircraft",
                  errors,
                  jumpNumber,
              })[0]
            : "Unknown aircraft";
        if (!location || !aircraftName) {
            continue;
        }
        needsUnknownLocation ||= !locationId;
        needsUnknownAircraft ||= !aircraftId;
        const description = xmlString(record, "notes");
        const cutaway = xmlString(record, "cutaway");
        needsCutawayType ||= cutaway === "true";
        const resolvedJumpTypes = resolveXmlNames({
            ids: xmlString(record, "skydive_type_id")
                ? [requiredXmlString(record, "skydive_type_id")]
                : [],
            catalog: catalogs.jumpTypes,
            resourceName: "skydive type",
            errors,
            jumpNumber,
        });
        const jumpTypesWithCutaway = addCutawayJumpType(
            resolvedJumpTypes,
            cutaway === "true",
        );
        let gear: string[];
        let jumpDate: string;
        let exitAltitude: number;
        let openingAltitude: number;
        let freefallTime: number;
        try {
            gear = resolveXmlNames({
                ids: xmlRigIds(record),
                catalog: catalogs.gear,
                resourceName: "rig",
                errors,
                jumpNumber,
            });
            jumpDate = requiredXmlString(record, "date");
            exitAltitude = xmlNumber(record, "exit_altitude", 1);
            openingAltitude = xmlNumber(record, "deployment_altitude", 0);
            freefallTime = xmlNumber(record, "freefall_time", 0);
        } catch (error) {
            errors.push(`${jumpLabel}: ${errorMessage(error)}`);
            continue;
        }
        records.push({
            type: "jump",
            jumpNumber,
            jumpDate,
            exitAltitude,
            openingAltitude,
            freefallTime,
            location,
            aircraft: [aircraftName],
            gear,
            jumpTypes: jumpTypesWithCutaway,
            ...(description ? { description } : {}),
        });
    }
    return {
        records,
        needsUnknownLocation,
        needsUnknownAircraft,
        needsCutawayType,
    };
}

/** Parses a Skydiving Logbook XML document into logbook import records. */
export function parseSkydivingLogbookXml(xml: string): ImportRecord[] {
    validateXml(xml);
    const parser = new XMLParser({ parseTagValue: false, trimValues: false });
    const parsed = xmlObject(parser.parse(xml), "XML document");
    const logbook = xmlObject(parsed.skydiving_logbook, "skydiving_logbook");
    const errors: string[] = [];
    const catalogs = {
        locations: createXmlCatalog({
            value: logbook.locations,
            itemName: "location",
            type: "location",
            label: "Location",
            errors,
        }),
        aircraft: createXmlCatalog({
            value: logbook.aircrafts,
            itemName: "aircraft",
            type: "aircraft",
            label: "Aircraft",
            errors,
        }),
        gear: createXmlCatalog({
            value: logbook.rigs,
            itemName: "rig",
            type: "gear",
            label: "Rig",
            errors,
        }),
        jumpTypes: createXmlCatalog({
            value: logbook.skydive_types,
            itemName: "skydive_type",
            type: "jumpType",
            label: "Skydive type",
            errors,
        }),
    };
    const parsedJumps = parseXmlJumps(logbook, catalogs, errors);
    if (errors.length > 0) {
        throw new Error(errors.join("\n"));
    }
    return [
        ...catalogs.aircraft.records,
        ...(parsedJumps.needsUnknownAircraft
            ? [
                  {
                      type: "aircraft" as const,
                      name: "Unknown aircraft",
                      previousCount: 0,
                  },
              ]
            : []),
        ...catalogs.gear.records,
        ...catalogs.jumpTypes.records,
        ...(parsedJumps.needsCutawayType &&
        !catalogs.jumpTypes.records.some(
            (record) => normalizeName(record.name) === "cutaway",
        )
            ? [
                  {
                      type: "jumpType" as const,
                      name: "Cutaway",
                      previousCount: 0,
                  },
              ]
            : []),
        ...catalogs.locations.records,
        ...(parsedJumps.needsUnknownLocation
            ? [
                  {
                      type: "location" as const,
                      name: "Unknown location",
                      previousCount: 0,
                  },
              ]
            : []),
        ...parsedJumps.records,
    ];
}
