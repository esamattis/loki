import { eq } from "drizzle-orm";
import { z } from "zod/v4";
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
import { LogbookPage } from "./layout";

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

function normalizeName(name: string): string {
    return name.trim().toLocaleLowerCase();
}

function resourceMap(rows: NamedResource[]): Map<string, string> {
    return new Map(rows.map((row) => [normalizeName(row.name), row.uuid]));
}

function TransferPage(props: { errors?: string[]; notice?: string }) {
    return (
        <LogbookPage title="Import or export logbook">
            <section className="space-y-5 rounded-lg bg-white p-5 shadow-sm">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                        Export
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                        Download your logbook as a JSON Lines file. It uses
                        names instead of internal IDs.
                    </p>
                    <a
                        href={routes.logbookExport({})}
                        className="mt-3 inline-block rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                    >
                        Export logbook
                    </a>
                </div>
                <div className="border-t border-gray-200 pt-5">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Import
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                        Import a JSON Lines file. Existing gear, locations,
                        aircraft, and jump types are matched by name.
                    </p>
                    {props.notice && (
                        <p className="mt-3 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">
                            {props.notice}
                        </p>
                    )}
                    {props.errors && props.errors.length > 0 && (
                        <ul className="mt-3 space-y-1 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                            {props.errors.map((error) => (
                                <li>{error}</li>
                            ))}
                        </ul>
                    )}
                    <form
                        method="post"
                        encType="multipart/form-data"
                        className="mt-4 flex flex-wrap items-end gap-3"
                    >
                        <label className="block text-sm font-medium text-gray-700">
                            JSONL file
                            <input
                                type="file"
                                name="file"
                                accept=".jsonl,application/x-ndjson,application/json"
                                required
                                className="mt-1 block w-full cursor-pointer rounded-md border border-gray-300 bg-white text-sm text-gray-700 file:mr-3 file:cursor-pointer file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-blue-700"
                            />
                        </label>
                        <button
                            type="submit"
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Import logbook
                        </button>
                    </form>
                    <details className="mt-5 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                        <summary className="cursor-pointer font-medium text-gray-900">
                            Export file format
                        </summary>
                        <div className="mt-3 space-y-3">
                            <p>
                                Export files use JSON Lines: one JSON object per
                                line. Resources appear before jumps, which refer
                                to them by name.
                            </p>
                            <p>
                                For example, this file imports an aircraft,
                                gear, jump type, location, and one jump:
                            </p>
                            <pre className="overflow-x-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
                                <code>{`{"type":"aircraft","name":"Twin Otter","previousCount":120,"description":"Fast turbine aircraft"}
{"type":"gear","name":"Navigator 260","previousCount":42,"description":"Main canopy"}
{"type":"jumpType","name":"Formation skydiving","previousCount":18,"description":"Four-way training"}
{"type":"location","name":"Skydive Example","previousCount":300,"description":"Home drop zone"}
{"type":"jump","jumpNumber":301,"exitAltitude":4000,"openingAltitude":1000,"freefallTime":55,"location":"Skydive Example","aircraft":"Twin Otter","gear":["Navigator 260"],"jumpTypes":["Formation skydiving"],"description":"Training jump"}`}</code>
                            </pre>
                            <p>
                                Resource records require <code>type</code>,{" "}
                                <code>name</code>, and{" "}
                                <code>previousCount</code>. Jump records require{" "}
                                <code>type</code>, <code>jumpNumber</code>,{" "}
                                <code>exitAltitude</code>,{" "}
                                <code>openingAltitude</code>,{" "}
                                <code>freefallTime</code>, <code>location</code>
                                , and <code>aircraft</code>. Descriptions may be
                                omitted or <code>null</code>, and{" "}
                                <code>gear</code> and <code>jumpTypes</code> may
                                be omitted or empty.
                            </p>
                            <p>
                                Re-importing a jump with the same jump number
                                updates it.
                            </p>
                        </div>
                    </details>
                </div>
            </section>
        </LogbookPage>
    );
}

async function readImportRecords(
    file: File,
): Promise<ImportRecord[] | string[]> {
    const lines = (await file.text())
        .split(/\r?\n/)
        .filter((line) => line.trim());
    if (lines.length === 0) {
        return ["The import file is empty"];
    }

    const records: ImportRecord[] = [];
    const errors: string[] = [];
    for (const [index, line] of lines.entries()) {
        let value: unknown;
        try {
            value = JSON.parse(line);
        } catch {
            errors.push(`Line ${index + 1}: Invalid JSON`);
            continue;
        }
        const result = ImportRecordSchema.safeParse(value);
        if (result.success) {
            records.push(result.data);
        } else {
            errors.push(
                `Line ${index + 1}: ${result.error.issues.map((issue) => issue.message).join(", ")}`,
            );
        }
    }
    return errors.length > 0 ? errors : records;
}

async function importRecords(c: AppRequestContext, records: ImportRecord[]) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
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
    const resources = {
        aircraft: resourceMap(aircraftRows),
        gear: resourceMap(gearRows),
        jumpType: resourceMap(jumpTypeRows),
        location: resourceMap(locationRows),
    };
    const jumpUuids = new Map(
        jumpRows.map((jump) => [jump.jumpNumber, jump.uuid]),
    );
    const queries = [];

    for (const record of records) {
        if (record.type === "jump") {
            continue;
        }
        const key = normalizeName(record.name);
        if (resources[record.type].has(key)) {
            continue;
        }
        const uuid = crypto.randomUUID();
        resources[record.type].set(key, uuid);
        const description = record.description || null;
        if (record.type === "aircraft") {
            queries.push(
                db.insert(aircrafts).values({
                    uuid,
                    userUuid,
                    name: record.name,
                    previousJumpCount: record.previousCount,
                    description,
                }),
            );
        } else if (record.type === "gear") {
            queries.push(
                db.insert(gear).values({
                    uuid,
                    userUuid,
                    name: record.name,
                    previousUsageCount: record.previousCount,
                    description,
                }),
            );
        } else if (record.type === "jumpType") {
            queries.push(
                db.insert(jumpTypes).values({
                    uuid,
                    userUuid,
                    name: record.name,
                    previousUsageCount: record.previousCount,
                    description,
                }),
            );
        } else {
            queries.push(
                db.insert(locations).values({
                    uuid,
                    userUuid,
                    name: record.name,
                    previousJumpCount: record.previousCount,
                    description,
                }),
            );
        }
    }

    function resolveResource(
        type: "aircraft" | "gear" | "jumpType" | "location",
        name: string,
    ): string {
        const key = normalizeName(name);
        const existing = resources[type].get(key);
        if (existing) {
            return existing;
        }
        const uuid = crypto.randomUUID();
        resources[type].set(key, uuid);
        if (type === "aircraft") {
            queries.push(
                db.insert(aircrafts).values({
                    uuid,
                    userUuid,
                    name,
                    previousJumpCount: 0,
                    description: null,
                }),
            );
        } else if (type === "gear") {
            queries.push(
                db.insert(gear).values({
                    uuid,
                    userUuid,
                    name,
                    previousUsageCount: 0,
                    description: null,
                }),
            );
        } else if (type === "jumpType") {
            queries.push(
                db.insert(jumpTypes).values({
                    uuid,
                    userUuid,
                    name,
                    previousUsageCount: 0,
                    description: null,
                }),
            );
        } else {
            queries.push(
                db.insert(locations).values({
                    uuid,
                    userUuid,
                    name,
                    previousJumpCount: 0,
                    description: null,
                }),
            );
        }
        return uuid;
    }

    let importedJumps = 0;
    for (const record of records) {
        if (record.type !== "jump") {
            continue;
        }
        const existingJumpUuid = jumpUuids.get(record.jumpNumber);
        const jumpUuid = existingJumpUuid ?? crypto.randomUUID();
        jumpUuids.set(record.jumpNumber, jumpUuid);
        const locationUuid = resolveResource("location", record.location);
        const aircraftUuid = resolveResource("aircraft", record.aircraft);
        const gearUuids = record.gear.map((name) =>
            resolveResource("gear", name),
        );
        const jumpTypeUuids = record.jumpTypes.map((name) =>
            resolveResource("jumpType", name),
        );
        const jumpValues = {
            locationUuid,
            aircraftUuid,
            exitAltitude: record.exitAltitude,
            openingAltitude: record.openingAltitude,
            freefallTime: record.freefallTime,
            description: record.description || null,
        };
        if (existingJumpUuid) {
            queries.push(
                db
                    .update(jumps)
                    .set(jumpValues)
                    .where(eq(jumps.uuid, jumpUuid)),
                db
                    .delete(jumpsToGear)
                    .where(eq(jumpsToGear.jumpUuid, jumpUuid)),
                db
                    .delete(jumpsToJumpTypes)
                    .where(eq(jumpsToJumpTypes.jumpUuid, jumpUuid)),
            );
        } else {
            queries.push(
                db.insert(jumps).values({
                    uuid: jumpUuid,
                    userUuid,
                    jumpNumber: record.jumpNumber,
                    ...jumpValues,
                }),
            );
        }
        queries.push(
            ...gearUuids.map((gearUuid) =>
                db.insert(jumpsToGear).values({ jumpUuid, gearUuid }),
            ),
            ...jumpTypeUuids.map((jumpTypeUuid) =>
                db.insert(jumpsToJumpTypes).values({ jumpUuid, jumpTypeUuid }),
            ),
        );
        importedJumps++;
    }
    if (queries.length > 0) {
        for (const query of queries) {
            await query.run();
        }
    }
    return importedJumps;
}

async function renderTransfer(c: AppRequestContext) {
    return c.render(<TransferPage />);
}

async function handleTransfer(c: AppRequestContext) {
    const formData = await c.req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
        return c.render(
            <TransferPage errors={["Choose a JSONL file to import"]} />,
        );
    }
    const result = await readImportRecords(file);
    if (result.length > 0 && typeof result[0] === "string") {
        return c.render(<TransferPage errors={result as string[]} />);
    }
    const importedJumps = await importRecords(c, result as ImportRecord[]);
    return c.render(
        <TransferPage
            notice={`Imported ${importedJumps} ${importedJumps === 1 ? "jump" : "jumps"}`}
        />,
    );
}

async function exportLogbook(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
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
    const records = [
        ...aircraftRows.map((row) => ({
            type: "aircraft",
            name: row.name,
            previousCount: row.previousJumpCount,
            description: row.description,
        })),
        ...gearRows.map((row) => ({
            type: "gear",
            name: row.name,
            previousCount: row.previousUsageCount,
            description: row.description,
        })),
        ...jumpTypeRows.map((row) => ({
            type: "jumpType",
            name: row.name,
            previousCount: row.previousUsageCount,
            description: row.description,
        })),
        ...locationRows.map((row) => ({
            type: "location",
            name: row.name,
            previousCount: row.previousJumpCount,
            description: row.description,
        })),
        ...jumpRows.map((row) => ({
            type: "jump",
            jumpNumber: row.jumpNumber,
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
    return c.body(
        records.map((record) => JSON.stringify(record)).join("\n") + "\n",
        200,
        {
            "Content-Disposition": 'attachment; filename="jump-logbook.jsonl"',
            "Content-Type": "application/x-ndjson; charset=utf-8",
        },
    );
}

app.get(routes.logbookTransfer.route, renderTransfer);
app.post(routes.logbookTransfer.route, handleTransfer);
app.get(routes.logbookExport.route, exportLogbook);
