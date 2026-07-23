import { eq } from "drizzle-orm";
import { z } from "zod";
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
import { TransferPage } from "@/route-handlers/logbook/transfer/page";
import { parseSkydivingLogbookXml } from "@/route-handlers/logbook/transfer/skydiving-logbook-xml";
import { parseCsvRows, splitCsvList } from "@/utils/csv";

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
        exitAltitude: z.preprocess(
            (value) => (value === "" ? undefined : value),
            z.coerce
                .number()
                .int("Exit altitude must be a whole number")
                .min(0, "Exit altitude cannot be negative")
                .optional()
                .default(0),
        ),
        openingAltitude: z.preprocess(
            (value) => (value === "" ? undefined : value),
            z.coerce
                .number()
                .int("Opening altitude must be a whole number")
                .min(0, "Opening altitude cannot be negative")
                .optional()
                .default(0),
        ),
        freefallTime: z.preprocess(
            (value) => (value === "" ? undefined : value),
            z.coerce
                .number()
                .int("Freefall time must be a whole number")
                .min(0, "Freefall time cannot be negative")
                .optional()
                .default(0),
        ),
        location: z.string().trim().default(""),
        aircraft: z.array(z.string().trim().min(1)).default([]),
        gear: z.array(z.string().trim().min(1)).default([]),
        jumpTypes: z.array(z.string().trim().min(1)).default([]),
        description: z.string().trim().max(2_000).nullable().optional(),
    }),
]);

const JsonImportSchema = z.object({
    csv: z.string(),
    reset: z.boolean(),
});

export type ImportRecord = z.infer<typeof ImportRecordSchema>;

interface NamedResource {
    uuid: string;
    name: string;
}

type ResourceType = Exclude<ImportRecord["type"], "jump">;

interface ImportStatistics {
    aircraft: number;
    gear: number;
    jumpTypes: number;
    locations: number;
    jumps: number;
}

const RESOURCE_STATISTIC: Record<
    ResourceType,
    Exclude<keyof ImportStatistics, "jumps">
> = {
    aircraft: "aircraft",
    gear: "gear",
    jumpType: "jumpTypes",
    location: "locations",
};

type ImportDatabase = ReturnType<typeof getAppContext>["db"];

type ImportQuery = Parameters<ImportDatabase["batch"]>[0][number];

function normalizeName(name: string): string {
    return name.trim().toLocaleLowerCase();
}

function resourceMap(rows: NamedResource[]): Map<string, string> {
    return new Map(rows.map((row) => [normalizeName(row.name), row.uuid]));
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
            aircraft: splitCsvList(get(9)),
            gear: splitCsvList(get(10)),
            jumpTypes: splitCsvList(get(11)),
            description: emptyToUndefined(get(12)) ?? null,
        };
    }
    return { type };
}

export function parseCsvImport(
    content: string,
): { errors: string[] } | { records: ImportRecord[] } {
    const parseResult = parseCsvRows(content);
    if (!parseResult.success) {
        return {
            errors: [
                `CSV line ${parseResult.error.line}: ${parseResult.error.message}`,
            ],
        };
    }
    const rows = parseResult.rows;
    if (rows.length === 0) {
        return { errors: ["The import file is empty"] };
    }
    const headerFields = rows[0]!.fields.map((field) => field.trim());
    if (
        headerFields.length !== CSV_HEADERS.length ||
        CSV_HEADERS.some((header, index) => headerFields[index] !== header)
    ) {
        return {
            errors: [`CSV header must be: ${CSV_HEADERS.join(",")}`],
        };
    }
    if (rows.length === 1) {
        return { errors: ["The import file has no data rows"] };
    }
    const records: ImportRecord[] = [];
    const errors: string[] = [];
    for (const row of rows.slice(1)) {
        const result = ImportRecordSchema.safeParse(
            rowToImportValue(row.fields),
        );
        if (result.success) {
            records.push(result.data);
        } else {
            errors.push(
                `Row ${row.line}: ${result.error.issues.map((issue) => issue.message).join(", ")}`,
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
    readonly db: ImportDatabase;
    readonly userUuid: string;
    readonly resources: Record<ResourceType, Map<string, string>>;
    readonly jumpUuids: Map<number, string>;
    readonly statistics: ImportStatistics = {
        aircraft: 0,
        gear: 0,
        jumpTypes: 0,
        locations: 0,
        jumps: 0,
    };

    private constructor(config: {
        db: ImportDatabase;
        userUuid: string;
        resources: Record<ResourceType, Map<string, string>>;
        jumpUuids: Map<number, string>;
    }) {
        this.db = config.db;
        this.userUuid = config.userUuid;
        this.resources = config.resources;
        this.jumpUuids = config.jumpUuids;
    }

    /** Loads existing user resources for an import. */
    static async create(
        db: ImportDatabase,
        userUuid: string,
        clearAll: boolean,
    ): Promise<ImportState> {
        if (clearAll) {
            return new ImportState({
                db,
                userUuid,
                resources: {
                    aircraft: new Map(),
                    gear: new Map(),
                    jumpType: new Map(),
                    location: new Map(),
                },
                jumpUuids: new Map(),
            });
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
        return new ImportState({
            db,
            userUuid,
            resources: {
                aircraft: resourceMap(aircraftRows),
                gear: resourceMap(gearRows),
                jumpType: resourceMap(jumpTypeRows),
                location: resourceMap(locationRows),
            },
            jumpUuids: new Map(
                jumpRows.map((jump) => [jump.jumpNumber, jump.uuid]),
            ),
        });
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
    queueResource(config: {
        type: ResourceType;
        name: string;
        previousCount: number;
        description: string | null | undefined;
    }): string {
        const uuid = crypto.randomUUID();
        this.resources[config.type].set(normalizeName(config.name), uuid);
        this.statistics[RESOURCE_STATISTIC[config.type]]++;
        if (config.type === "aircraft") {
            this.queueQuery(
                this.db.insert(aircrafts).values({
                    uuid,
                    userUuid: this.userUuid,
                    name: config.name,
                    previousJumpCount: config.previousCount,
                    description: config.description || null,
                }),
            );
        } else if (config.type === "gear") {
            this.queueQuery(
                this.db.insert(gear).values({
                    uuid,
                    userUuid: this.userUuid,
                    name: config.name,
                    previousUsageCount: config.previousCount,
                    description: config.description || null,
                }),
            );
        } else if (config.type === "jumpType") {
            this.queueQuery(
                this.db.insert(jumpTypes).values({
                    uuid,
                    userUuid: this.userUuid,
                    name: config.name,
                    previousUsageCount: config.previousCount,
                    description: config.description || null,
                }),
            );
        } else {
            this.queueQuery(
                this.db.insert(locations).values({
                    uuid,
                    userUuid: this.userUuid,
                    name: config.name,
                    previousJumpCount: config.previousCount,
                    description: config.description || null,
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
            this.queueResource({
                type: record.type,
                name: record.name,
                previousCount: record.previousCount,
                description: record.description,
            });
        }
    }

    /** Queues a jump upsert along with its resource and relation changes. */
    queueJump(record: Extract<ImportRecord, { type: "jump" }>) {
        const existingJumpUuid = this.jumpUuids.get(record.jumpNumber);
        const jumpUuid = existingJumpUuid ?? crypto.randomUUID();
        this.jumpUuids.set(record.jumpNumber, jumpUuid);
        const locationUuid = record.location
            ? (this.resources.location.get(normalizeName(record.location)) ??
              this.queueResource({
                  type: "location",
                  name: record.location,
                  previousCount: 0,
                  description: null,
              }))
            : null;
        const aircraftByUuid = new Map<string, string>();
        for (const name of record.aircraft) {
            const aircraftUuid =
                this.resources.aircraft.get(normalizeName(name)) ??
                this.queueResource({
                    type: "aircraft",
                    name,
                    previousCount: 0,
                    description: null,
                });
            aircraftByUuid.set(aircraftUuid, name);
        }
        const gearByUuid = new Map<string, string>();
        for (const name of record.gear) {
            const gearUuid =
                this.resources.gear.get(normalizeName(name)) ??
                this.queueResource({
                    type: "gear",
                    name,
                    previousCount: 0,
                    description: null,
                });
            gearByUuid.set(gearUuid, name);
        }
        const jumpTypeByUuid = new Map<string, string>();
        for (const name of record.jumpTypes) {
            const jumpTypeUuid =
                this.resources.jumpType.get(normalizeName(name)) ??
                this.queueResource({
                    type: "jumpType",
                    name,
                    previousCount: 0,
                    description: null,
                });
            jumpTypeByUuid.set(jumpTypeUuid, name);
        }
        const jumpValues = {
            locationUuid,
            exitAltitude: record.exitAltitude,
            openingAltitude: record.openingAltitude,
            freefallTime: record.freefallTime,
            jumpDate: record.jumpDate ?? getToday(),
            description: record.description || null,
        };
        if (existingJumpUuid) {
            this.queueQuery(
                this.db
                    .delete(jumpsToAircrafts)
                    .where(eq(jumpsToAircrafts.jumpUuid, jumpUuid)),
            );
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
                    createdAt: Math.floor(Date.now() / 1_000),
                    ...jumpValues,
                }),
            );
        }
        for (const aircraftUuid of aircraftByUuid.keys()) {
            this.queueQuery(
                this.db
                    .insert(jumpsToAircrafts)
                    .values({ jumpUuid, aircraftUuid }),
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

    /** Queues all jump records and records their count. */
    queueJumps(records: ImportRecord[]) {
        for (const record of records) {
            if (record.type !== "jump") {
                continue;
            }
            this.queueJump(record);
            this.statistics.jumps++;
        }
    }
}

/** Imports validated records for the current user in one atomic D1 batch. */
export async function importRecords(
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
    state.queueJumps(records);
    const [firstQuery, ...remainingQueries] = state.queries;
    if (!firstQuery) {
        return state.statistics;
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
    return state.statistics;
}

function jsonImportErrors(error: z.ZodError): string[] {
    return error.issues.map((issue) => {
        const path = issue.path.join(".");
        return path ? `${path}: ${issue.message}` : issue.message;
    });
}

async function handleJsonTransfer(c: AppRequestContext) {
    let body: unknown;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ errors: ["Request body must be valid JSON"] }, 400);
    }
    const bodyResult = JsonImportSchema.safeParse(body);
    if (!bodyResult.success) {
        return c.json({ errors: jsonImportErrors(bodyResult.error) }, 400);
    }
    const importResult = parseCsvImport(bodyResult.data.csv);
    if ("errors" in importResult) {
        return c.json({ errors: importResult.errors }, 400);
    }
    try {
        const statistics = await importRecords(
            c,
            importResult.records,
            bodyResult.data.reset,
        );
        return c.json({ statistics });
    } catch (error) {
        return c.json(
            {
                errors: [
                    error instanceof Error
                        ? error.message
                        : "Could not complete the import. All changes were rolled back.",
                ],
            },
            400,
        );
    }
}

/** Handles an uploaded logbook import file. */
async function handleTransfer(c: AppRequestContext) {
    if (c.req.header("Content-Type")?.startsWith("application/json")) {
        return handleJsonTransfer(c);
    }
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
        const statistics = await importRecords(c, result.records, clearAll);
        return c.render(
            <TransferPage
                notice={`Imported ${statistics.jumps} ${statistics.jumps === 1 ? "jump" : "jumps"}`}
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

export function register(app: App) {
    app.get(routes.logbook.transfer.index.route, (c) =>
        c.render(<TransferPage />),
    );
    app.post(routes.logbook.transfer.index.route, handleTransfer);
}
