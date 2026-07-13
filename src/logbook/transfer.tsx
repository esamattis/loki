/* eslint-disable max-lines, max-lines-per-function */
import { eq } from "drizzle-orm";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import { app, getAppContext, type AppRequestContext } from "../app";
import * as routes from "../routes";
import {
    aircrafts,
    gear,
    jumps,
    jumpsToGear,
    jumpsToJumpTypes,
    jumpTypes,
    locations,
} from "../schema";
import { TransferPage } from "./transfer-page";

function isValidJumpDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}

function getToday(): string {
    return new Date().toISOString().slice(0, 10);
}

const NamedResourceSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    previousCount: z.coerce
        .number()
        .int("Previous count must be a whole number")
        .min(0, "Previous count cannot be negative"),
    description: z.string().trim().max(2_000).nullable().optional(),
});

const ImportRecordSchema = z.discriminatedUnion("type", [
    NamedResourceSchema.extend({ type: z.literal("aircraft") }),
    NamedResourceSchema.extend({ type: z.literal("gear") }),
    NamedResourceSchema.extend({ type: z.literal("jumpType") }),
    NamedResourceSchema.extend({ type: z.literal("location") }),
    z.object({
        type: z.literal("jump"),
        jumpNumber: z.coerce
            .number()
            .int("Jump number must be a whole number")
            .positive("Jump number must be positive"),
        jumpDate: z
            .string()
            .refine(isValidJumpDate, "Jump date must be valid")
            .optional(),
        exitAltitude: z.coerce
            .number()
            .int("Exit altitude must be a whole number")
            .positive("Exit altitude must be positive"),
        openingAltitude: z.coerce
            .number()
            .int("Opening altitude must be a whole number")
            .min(0, "Opening altitude cannot be negative"),
        freefallTime: z.coerce
            .number()
            .int("Freefall time must be a whole number")
            .min(0, "Freefall time cannot be negative"),
        location: z.string().trim().min(1, "Location is required"),
        aircraft: z.string().trim().min(1, "Aircraft is required"),
        gear: z.array(z.string().trim().min(1)).default([]),
        jumpTypes: z.array(z.string().trim().min(1)).default([]),
        description: z.string().trim().max(2_000).nullable().optional(),
    }),
]);

type ImportRecord = z.infer<typeof ImportRecordSchema>;

interface NamedResource {
    uuid: string;
    name: string;
}

type ResourceType = Exclude<ImportRecord["type"], "jump">;

type ImportDatabase = ReturnType<typeof getAppContext>["db"];

type ImportQuery = Parameters<ImportDatabase["batch"]>[0][number];

function normalizeName(name: string): string {
    return name.trim().toLocaleLowerCase();
}

function resourceMap(rows: NamedResource[]): Map<string, string> {
    return new Map(rows.map((row) => [normalizeName(row.name), row.uuid]));
}

interface XmlCatalog {
    records: Exclude<ImportRecord, { type: "jump" }>[];
    namesById: Map<string, string>;
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

function xmlItems(value: unknown): unknown[] {
    return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function xmlString(record: Record<string, unknown>, field: string) {
    const value = record[field];
    return typeof value === "string" ? value.trim() || undefined : undefined;
}

function requiredXmlString(record: Record<string, unknown>, field: string) {
    const value = xmlString(record, field);
    if (!value) {
        throw new Error(`Missing ${field}`);
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
            `${field} must be a whole number of at least ${minimum}`,
        );
    }
    return value;
}

function createXmlCatalog(
    value: unknown,
    itemName: string,
    type: ResourceType,
): XmlCatalog {
    const records: Exclude<ImportRecord, { type: "jump" }>[] = [];
    const namesById = new Map<string, string>();
    const names = new Set<string>();
    for (const item of xmlItems(xmlObject(value, itemName)[itemName])) {
        const record = xmlObject(item, itemName);
        const id = requiredXmlString(record, "id");
        const name = requiredXmlString(record, "name");
        namesById.set(id, name);
        if (!names.has(name)) {
            records.push({
                type,
                name,
                previousCount: xmlString(record, "previous_jump_count")
                    ? xmlNumber(record, "previous_jump_count", 0)
                    : 0,
            });
            names.add(name);
        }
    }
    return { records, namesById };
}

function resolveXmlNames(
    ids: string[],
    catalog: XmlCatalog,
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

function xmlRigIds(record: Record<string, unknown>): string[] {
    if (record.rigs === undefined) {
        return [];
    }
    return xmlItems(xmlObject(record.rigs, "rigs").rig_id).flatMap((value) =>
        typeof value === "string" && value.trim() ? [value.trim()] : [],
    );
}

function parseSkydivingLogbookXml(xml: string): ImportRecord[] {
    const parser = new XMLParser({ parseTagValue: false, trimValues: false });
    const parsed = xmlObject(parser.parse(xml), "XML document");
    const logbook = xmlObject(parsed.skydiving_logbook, "skydiving_logbook");
    const locations = createXmlCatalog(
        logbook.locations,
        "location",
        "location",
    );
    const aircraft = createXmlCatalog(
        logbook.aircrafts,
        "aircraft",
        "aircraft",
    );
    const gearCatalog = createXmlCatalog(logbook.rigs, "rig", "gear");
    const jumpTypes = createXmlCatalog(
        logbook.skydive_types,
        "skydive_type",
        "jumpType",
    );
    const jumps: Extract<ImportRecord, { type: "jump" }>[] = [];
    const errors: string[] = [];
    let needsUnknownLocation = false;
    let needsUnknownAircraft = false;
    let needsCutawayType = false;
    for (const item of xmlItems(
        xmlObject(logbook.log_entries, "log_entries").log_entry,
    )) {
        const record = xmlObject(item, "log_entry");
        const jumpNumber = xmlNumber(record, "jump_number", 1);
        const locationId = xmlString(record, "location_id");
        const aircraftId = xmlString(record, "aircraft_id");
        const location = locationId
            ? resolveXmlNames(
                  [locationId],
                  locations,
                  "location",
                  errors,
                  jumpNumber,
              )[0]
            : "Unknown location";
        const aircraftName = aircraftId
            ? resolveXmlNames(
                  [aircraftId],
                  aircraft,
                  "aircraft",
                  errors,
                  jumpNumber,
              )[0]
            : "Unknown aircraft";
        if (!location || !aircraftName) {
            continue;
        }
        needsUnknownLocation ||= !locationId;
        needsUnknownAircraft ||= !aircraftId;
        const description = xmlString(record, "notes");
        const cutaway = xmlString(record, "cutaway");
        needsCutawayType ||= cutaway === "true";
        const resolvedJumpTypes = resolveXmlNames(
            xmlString(record, "skydive_type_id")
                ? [requiredXmlString(record, "skydive_type_id")]
                : [],
            jumpTypes,
            "skydive type",
            errors,
            jumpNumber,
        );
        const jumpTypesWithCutaway = addCutawayJumpType(
            resolvedJumpTypes,
            cutaway === "true",
        );
        jumps.push({
            type: "jump",
            jumpNumber,
            jumpDate: requiredXmlString(record, "date"),
            exitAltitude: xmlNumber(record, "exit_altitude", 1),
            openingAltitude: xmlNumber(record, "deployment_altitude", 0),
            freefallTime: xmlNumber(record, "freefall_time", 0),
            location,
            aircraft: aircraftName,
            gear: resolveXmlNames(
                xmlRigIds(record),
                gearCatalog,
                "rig",
                errors,
                jumpNumber,
            ),
            jumpTypes: jumpTypesWithCutaway,
            ...(description ? { description } : {}),
        });
    }
    if (errors.length > 0) {
        throw new Error(errors.join("\n"));
    }
    return [
        ...aircraft.records,
        ...(needsUnknownAircraft
            ? [
                  {
                      type: "aircraft" as const,
                      name: "Unknown aircraft",
                      previousCount: 0,
                  },
              ]
            : []),
        ...gearCatalog.records,
        ...jumpTypes.records,
        ...(needsCutawayType &&
        !jumpTypes.records.some(
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
        ...locations.records,
        ...(needsUnknownLocation
            ? [
                  {
                      type: "location" as const,
                      name: "Unknown location",
                      previousCount: 0,
                  },
              ]
            : []),
        ...jumps,
    ];
}

function parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i]!;
        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ",") {
            fields.push(current);
            current = "";
        } else {
            current += ch;
        }
    }
    fields.push(current);
    return fields;
}

function splitCsvList(value: string): string[] {
    if (!value.trim()) {
        return [];
    }
    const items: string[] = [];
    let current = "";
    for (let i = 0; i < value.length; i++) {
        if (value[i] === ";") {
            if (value[i + 1] === ";") {
                current += ";";
                i++;
            } else if (value[i + 1] === " ") {
                items.push(current);
                current = "";
                i++;
            } else {
                items.push(current);
                current = "";
            }
        } else {
            current += value[i]!;
        }
    }
    items.push(current);
    return items.map((item) => item.trim()).filter((item) => item.length > 0);
}

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

function emptyToUndefined(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
}

function rowToImportValue(fields: string[]): unknown {
    const get = (index: number) => fields[index] ?? "";
    const type = get(0).trim();
    if (
        type === "aircraft" ||
        type === "gear" ||
        type === "jumpType" ||
        type === "location"
    ) {
        return {
            type,
            name: get(1),
            previousCount: emptyToUndefined(get(2)) ?? "0",
            description: emptyToUndefined(get(12)) ?? null,
        };
    }
    if (type === "jump") {
        return {
            type,
            jumpNumber: get(3),
            jumpDate: emptyToUndefined(get(4)),
            exitAltitude: get(5),
            openingAltitude: get(6),
            freefallTime: get(7),
            location: get(8),
            aircraft: get(9),
            gear: splitCsvList(get(10)),
            jumpTypes: splitCsvList(get(11)),
            description: emptyToUndefined(get(12)) ?? null,
        };
    }
    return { type };
}

function parseCsvImport(
    content: string,
): { errors: string[] } | { records: ImportRecord[] } {
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) {
        return { errors: ["The import file is empty"] };
    }
    const headerFields = parseCsvLine(lines[0]!).map((field) => field.trim());
    if (
        headerFields.length !== CSV_HEADERS.length ||
        CSV_HEADERS.some((header, index) => headerFields[index] !== header)
    ) {
        return {
            errors: [`CSV header must be: ${CSV_HEADERS.join(",")}`],
        };
    }
    if (lines.length === 1) {
        return { errors: ["The import file has no data rows"] };
    }
    const records: ImportRecord[] = [];
    const errors: string[] = [];
    for (const [index, line] of lines.slice(1).entries()) {
        const fields = parseCsvLine(line);
        const result = ImportRecordSchema.safeParse(rowToImportValue(fields));
        if (result.success) {
            records.push(result.data);
        } else {
            errors.push(
                `Row ${index + 2}: ${result.error.issues.map((issue) => issue.message).join(", ")}`,
            );
        }
    }
    return errors.length > 0 ? { errors } : { records };
}

/** Reads and validates CSV or Skydiving Logbook XML import records. */
async function readImportRecords(
    file: File,
): Promise<{ errors: string[] } | { records: ImportRecord[] }> {
    const content = await file.text();
    if (content.trimStart().startsWith("<")) {
        let values: unknown[];
        try {
            values = parseSkydivingLogbookXml(content);
        } catch (error) {
            return {
                errors: [
                    error instanceof Error
                        ? error.message
                        : "Invalid Skydiving Logbook XML",
                ],
            };
        }
        const records: ImportRecord[] = [];
        const errors: string[] = [];
        for (const [index, value] of values.entries()) {
            const result = ImportRecordSchema.safeParse(value);
            if (result.success) {
                records.push(result.data);
            } else {
                errors.push(
                    `XML record ${index + 1}: ${result.error.issues.map((issue) => issue.message).join(", ")}`,
                );
            }
        }
        return errors.length > 0 ? { errors } : { records };
    }

    return parseCsvImport(content);
}

/** Mutable state and queued operations for one logbook import. */
class ImportState {
    readonly queries: ImportQuery[] = [];

    private constructor(
        readonly db: ImportDatabase,
        readonly userUuid: string,
        readonly resources: Record<ResourceType, Map<string, string>>,
        readonly jumpUuids: Map<number, string>,
    ) {}

    /** Loads existing user resources for an import. */
    static async create(
        db: ImportDatabase,
        userUuid: string,
        clearAll: boolean,
    ): Promise<ImportState> {
        if (clearAll) {
            return new ImportState(
                db,
                userUuid,
                {
                    aircraft: new Map(),
                    gear: new Map(),
                    jumpType: new Map(),
                    location: new Map(),
                },
                new Map(),
            );
        }

        const [aircraftRows, gearRows, jumpRows, jumpTypeRows, locationRows] =
            await Promise.all([
                db
                    .select({ uuid: aircrafts.uuid, name: aircrafts.name })
                    .from(aircrafts)
                    .where(eq(aircrafts.userUuid, userUuid)),
                db
                    .select({ uuid: gear.uuid, name: gear.name })
                    .from(gear)
                    .where(eq(gear.userUuid, userUuid)),
                db
                    .select({ uuid: jumps.uuid, jumpNumber: jumps.jumpNumber })
                    .from(jumps)
                    .where(eq(jumps.userUuid, userUuid)),
                db
                    .select({ uuid: jumpTypes.uuid, name: jumpTypes.name })
                    .from(jumpTypes)
                    .where(eq(jumpTypes.userUuid, userUuid)),
                db
                    .select({ uuid: locations.uuid, name: locations.name })
                    .from(locations)
                    .where(eq(locations.userUuid, userUuid)),
            ]);
        return new ImportState(
            db,
            userUuid,
            {
                aircraft: resourceMap(aircraftRows),
                gear: resourceMap(gearRows),
                jumpType: resourceMap(jumpTypeRows),
                location: resourceMap(locationRows),
            },
            new Map(jumpRows.map((jump) => [jump.jumpNumber, jump.uuid])),
        );
    }

    /** Adds a database query to the atomic import batch. */
    queueQuery(query: ImportQuery) {
        this.queries.push(query);
    }

    /** Queues deletion of all logbook data belonging to the importing user. */
    clearAllData() {
        this.queueQuery(
            this.db.delete(jumps).where(eq(jumps.userUuid, this.userUuid)),
        );
        this.queueQuery(
            this.db.delete(gear).where(eq(gear.userUuid, this.userUuid)),
        );
        this.queueQuery(
            this.db
                .delete(jumpTypes)
                .where(eq(jumpTypes.userUuid, this.userUuid)),
        );
        this.queueQuery(
            this.db
                .delete(locations)
                .where(eq(locations.userUuid, this.userUuid)),
        );
        this.queueQuery(
            this.db
                .delete(aircrafts)
                .where(eq(aircrafts.userUuid, this.userUuid)),
        );
    }

    /** Queues insertion of a resource and records its UUID for later references. */
    queueResource(
        type: ResourceType,
        name: string,
        previousCount: number,
        description: string | null | undefined,
    ): string {
        const uuid = crypto.randomUUID();
        this.resources[type].set(normalizeName(name), uuid);
        if (type === "aircraft") {
            this.queueQuery(
                this.db.insert(aircrafts).values({
                    uuid,
                    userUuid: this.userUuid,
                    name,
                    previousJumpCount: previousCount,
                    description: description || null,
                }),
            );
        } else if (type === "gear") {
            this.queueQuery(
                this.db.insert(gear).values({
                    uuid,
                    userUuid: this.userUuid,
                    name,
                    previousUsageCount: previousCount,
                    description: description || null,
                }),
            );
        } else if (type === "jumpType") {
            this.queueQuery(
                this.db.insert(jumpTypes).values({
                    uuid,
                    userUuid: this.userUuid,
                    name,
                    previousUsageCount: previousCount,
                    description: description || null,
                }),
            );
        } else {
            this.queueQuery(
                this.db.insert(locations).values({
                    uuid,
                    userUuid: this.userUuid,
                    name,
                    previousJumpCount: previousCount,
                    description: description || null,
                }),
            );
        }
        return uuid;
    }

    /** Queues explicitly listed resources that are not already present. */
    queueListedResources(records: ImportRecord[]) {
        for (const record of records) {
            if (record.type === "jump") {
                continue;
            }
            if (this.resources[record.type].has(normalizeName(record.name))) {
                continue;
            }
            this.queueResource(
                record.type,
                record.name,
                record.previousCount,
                record.description,
            );
        }
    }

    /** Queues a jump upsert along with its resource and relation changes. */
    queueJump(record: Extract<ImportRecord, { type: "jump" }>) {
        const existingJumpUuid = this.jumpUuids.get(record.jumpNumber);
        const jumpUuid = existingJumpUuid ?? crypto.randomUUID();
        this.jumpUuids.set(record.jumpNumber, jumpUuid);
        const locationUuid =
            this.resources.location.get(normalizeName(record.location)) ??
            this.queueResource("location", record.location, 0, null);
        const aircraftUuid =
            this.resources.aircraft.get(normalizeName(record.aircraft)) ??
            this.queueResource("aircraft", record.aircraft, 0, null);
        const gearByUuid = new Map<string, string>();
        for (const name of record.gear) {
            const gearUuid =
                this.resources.gear.get(normalizeName(name)) ??
                this.queueResource("gear", name, 0, null);
            gearByUuid.set(gearUuid, name);
        }
        const jumpTypeByUuid = new Map<string, string>();
        for (const name of record.jumpTypes) {
            const jumpTypeUuid =
                this.resources.jumpType.get(normalizeName(name)) ??
                this.queueResource("jumpType", name, 0, null);
            jumpTypeByUuid.set(jumpTypeUuid, name);
        }
        const jumpValues = {
            locationUuid,
            aircraftUuid,
            exitAltitude: record.exitAltitude,
            openingAltitude: record.openingAltitude,
            freefallTime: record.freefallTime,
            jumpDate: record.jumpDate ?? getToday(),
            description: record.description || null,
        };
        if (existingJumpUuid) {
            this.queueQuery(
                this.db
                    .update(jumps)
                    .set(jumpValues)
                    .where(eq(jumps.uuid, jumpUuid)),
            );
            this.queueQuery(
                this.db
                    .delete(jumpsToGear)
                    .where(eq(jumpsToGear.jumpUuid, jumpUuid)),
            );
            this.queueQuery(
                this.db
                    .delete(jumpsToJumpTypes)
                    .where(eq(jumpsToJumpTypes.jumpUuid, jumpUuid)),
            );
        } else {
            this.queueQuery(
                this.db.insert(jumps).values({
                    uuid: jumpUuid,
                    userUuid: this.userUuid,
                    jumpNumber: record.jumpNumber,
                    ...jumpValues,
                }),
            );
        }
        for (const gearUuid of gearByUuid.keys()) {
            this.queueQuery(
                this.db.insert(jumpsToGear).values({ jumpUuid, gearUuid }),
            );
        }
        for (const jumpTypeUuid of jumpTypeByUuid.keys()) {
            this.queueQuery(
                this.db
                    .insert(jumpsToJumpTypes)
                    .values({ jumpUuid, jumpTypeUuid }),
            );
        }
    }

    /** Queues all jump records and returns their count. */
    queueJumps(records: ImportRecord[]): number {
        let importedJumps = 0;
        for (const record of records) {
            if (record.type !== "jump") {
                continue;
            }
            this.queueJump(record);
            importedJumps++;
        }
        return importedJumps;
    }
}

/** Imports validated records for the current user in one atomic D1 batch. */
async function importRecords(
    c: AppRequestContext,
    records: ImportRecord[],
    clearAll: boolean,
) {
    const context = getAppContext(c);
    const state = await ImportState.create(
        context.db,
        context.getUser().uuid,
        clearAll,
    );
    if (clearAll) {
        state.clearAllData();
    }
    state.queueListedResources(records);
    const importedJumps = state.queueJumps(records);
    const [firstQuery, ...remainingQueries] = state.queries;
    if (!firstQuery) {
        return importedJumps;
    }
    try {
        await context.db.batch([firstQuery, ...remainingQueries]);
    } catch (error) {
        console.error(
            "Logbook import failed; all changes were rolled back",
            error,
        );
        throw new Error(
            "Could not complete the import. All changes were rolled back.",
        );
    }
    return importedJumps;
}

/** Handles an uploaded logbook import file. */
async function handleTransfer(c: AppRequestContext) {
    const formData = await c.req.formData();
    const clearAll = formData.get("clearAll") === "true";
    const file = formData.get("file");
    if (!(file instanceof File)) {
        return c.render(
            <TransferPage
                errors={["Choose a logbook file to import"]}
                clearAll={clearAll}
            />,
        );
    }
    const result = await readImportRecords(file);
    if ("errors" in result) {
        return c.render(
            <TransferPage errors={result.errors} clearAll={clearAll} />,
        );
    }
    try {
        const importedJumps = await importRecords(c, result.records, clearAll);
        return c.render(
            <TransferPage
                notice={`Imported ${importedJumps} ${importedJumps === 1 ? "jump" : "jumps"}`}
            />,
        );
    } catch (error) {
        return c.render(
            <TransferPage
                errors={[
                    error instanceof Error
                        ? error.message
                        : "Could not complete the import. All changes were rolled back.",
                ]}
                clearAll={clearAll}
            />,
        );
    }
}

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
    aircraft: string;
    gear: string[];
    jumpTypes: string[];
    description: string | null;
};

type ExportRecord = ExportNamedResource | ExportJump;

function escapeCsvField(value: string | number | null | undefined): string {
    if (value === null || value === undefined) {
        return "";
    }
    const text = String(value);
    if (/[",\n\r]/.test(text)) {
        return `"${text.replaceAll('"', '""')}"`;
    }
    return text;
}

function joinCsvList(values: string[]): string {
    return values.map((value) => value.replaceAll(";", ";;")).join("; ");
}

function formatExportCsv(records: ExportRecord[]): string {
    const rows = records.map((record) => {
        if (record.type === "jump") {
            return [
                record.type,
                "",
                "",
                record.jumpNumber,
                record.jumpDate,
                record.exitAltitude,
                record.openingAltitude,
                record.freefallTime,
                record.location,
                record.aircraft,
                joinCsvList(record.gear),
                joinCsvList(record.jumpTypes),
                record.description,
            ];
        }
        return [
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
        ];
    });
    return (
        [CSV_HEADERS, ...rows]
            .map((row) => row.map(escapeCsvField).join(","))
            .join("\n") + "\n"
    );
}

/** Exports the current user's logbook as a CSV download. */
async function exportLogbook(c: AppRequestContext) {
    const ctx = getAppContext(c);
    const db = ctx.db;
    const userUuid = ctx.getUser().uuid;
    const [aircraftRows, gearRows, jumpTypeRows, locationRows, jumpRows] =
        await Promise.all([
            db
                .select()
                .from(aircrafts)
                .where(eq(aircrafts.userUuid, userUuid))
                .orderBy(aircrafts.name),
            db
                .select()
                .from(gear)
                .where(eq(gear.userUuid, userUuid))
                .orderBy(gear.name),
            db
                .select()
                .from(jumpTypes)
                .where(eq(jumpTypes.userUuid, userUuid))
                .orderBy(jumpTypes.name),
            db
                .select()
                .from(locations)
                .where(eq(locations.userUuid, userUuid))
                .orderBy(locations.name),
            db
                .select({
                    uuid: jumps.uuid,
                    jumpNumber: jumps.jumpNumber,
                    jumpDate: jumps.jumpDate,
                    exitAltitude: jumps.exitAltitude,
                    openingAltitude: jumps.openingAltitude,
                    freefallTime: jumps.freefallTime,
                    description: jumps.description,
                    location: locations.name,
                    aircraft: aircrafts.name,
                })
                .from(jumps)
                .innerJoin(locations, eq(jumps.locationUuid, locations.uuid))
                .innerJoin(aircrafts, eq(jumps.aircraftUuid, aircrafts.uuid))
                .where(eq(jumps.userUuid, userUuid))
                .orderBy(jumps.jumpNumber),
        ]);
    const [jumpGearRows, jumpTypeRelationRows] = await Promise.all([
        db
            .select({ jumpUuid: jumpsToGear.jumpUuid, name: gear.name })
            .from(jumpsToGear)
            .innerJoin(gear, eq(jumpsToGear.gearUuid, gear.uuid))
            .innerJoin(jumps, eq(jumpsToGear.jumpUuid, jumps.uuid))
            .where(eq(jumps.userUuid, userUuid)),
        db
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
            .where(eq(jumps.userUuid, userUuid)),
    ]);
    const gearByJump = new Map<string, string[]>();
    const jumpTypesByJump = new Map<string, string[]>();
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
            aircraft: row.aircraft,
            gear: gearByJump.get(row.uuid) ?? [],
            jumpTypes: jumpTypesByJump.get(row.uuid) ?? [],
            description: row.description,
        })),
    ];
    return c.body(formatExportCsv(records), 200, {
        "Content-Disposition": 'attachment; filename="jump-logbook.csv"',
        "Content-Type": "text/csv; charset=utf-8",
    });
}

app.get(routes.logbookTransfer.route, (c) => c.render(<TransferPage />));
app.post(routes.logbookTransfer.route, handleTransfer);
app.get(routes.logbookExport.route, exportLogbook);
