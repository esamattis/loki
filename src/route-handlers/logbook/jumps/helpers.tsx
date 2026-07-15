import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { getAppContext, type AppRequestContext } from "@/app/app";
import * as routes from "@/routes";
import { aircrafts, gear, jumps, jumpTypes, locations } from "@/schema";
import {
    getJumpFormValues,
    type JumpFormValues,
} from "@/route-handlers/logbook/jumps/form";

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

const JumpSchema = z.object({
    locationUuid: z.string().optional().default(""),
    aircraftUuids: z.array(z.string()).default([]),
    jumpNumber: z.coerce
        .number()
        .int("Jump number must be a whole number")
        .positive("Jump number must be positive"),
    jumpDate: z.string().refine(isValidJumpDate, "Jump date must be valid"),
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
    description: z.string().trim().max(2_000).optional(),
    gearUuids: z.array(z.string()).default([]),
    jumpTypeUuids: z.array(z.string()).default([]),
    locationName: z.string().trim().optional().default(""),
    aircraftName: z.string().trim().optional().default(""),
    gearName: z.string().trim().optional().default(""),
    jumpTypeName: z.string().trim().optional().default(""),
});

export async function getJumpFormResources(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const [locationRows, aircraftRows, gearRows, jumpTypeRows] =
        await Promise.all([
            db
                .select({
                    uuid: locations.uuid,
                    name: locations.name,
                    archived: locations.archived,
                    description: locations.description,
                })
                .from(locations)
                .where(eq(locations.userUuid, userUuid))
                .orderBy(locations.name),
            db
                .select({
                    uuid: aircrafts.uuid,
                    name: aircrafts.name,
                    archived: aircrafts.archived,
                    description: aircrafts.description,
                })
                .from(aircrafts)
                .where(eq(aircrafts.userUuid, userUuid))
                .orderBy(aircrafts.name),
            db
                .select({
                    uuid: gear.uuid,
                    name: gear.name,
                    archived: gear.archived,
                    description: gear.description,
                })
                .from(gear)
                .where(eq(gear.userUuid, userUuid))
                .orderBy(gear.name),
            db
                .select({
                    uuid: jumpTypes.uuid,
                    name: jumpTypes.name,
                    archived: jumpTypes.archived,
                    description: jumpTypes.description,
                })
                .from(jumpTypes)
                .where(eq(jumpTypes.userUuid, userUuid))
                .orderBy(jumpTypes.name),
        ]);

    return {
        locations: locationRows,
        aircrafts: aircraftRows,
        gear: gearRows,
        jumpTypes: jumpTypeRows,
    };
}

type JumpFormResources = Awaited<ReturnType<typeof getJumpFormResources>>;

function ownsJumpResources(
    resources: JumpFormResources,
    data: {
        locationUuid: string | null;
        aircraftUuids: string[];
        gearUuids: string[];
        jumpTypeUuids: string[];
    },
) {
    return (
        (!data.locationUuid ||
            resources.locations.some(
                (item) => item.uuid === data.locationUuid,
            )) &&
        data.aircraftUuids.every((uuid) =>
            resources.aircrafts.some((item) => item.uuid === uuid),
        ) &&
        data.gearUuids.every((uuid) =>
            resources.gear.some((item) => item.uuid === uuid),
        ) &&
        data.jumpTypeUuids.every((uuid) =>
            resources.jumpTypes.some((item) => item.uuid === uuid),
        )
    );
}

function selectedJumpItemsAreOwned(
    resources: JumpFormResources,
    data: z.infer<typeof JumpSchema>,
) {
    return (
        data.gearUuids.every((uuid) =>
            resources.gear.some((item) => item.uuid === uuid),
        ) &&
        data.jumpTypeUuids.every((uuid) =>
            resources.jumpTypes.some((item) => item.uuid === uuid),
        ) &&
        data.aircraftUuids.every((uuid) =>
            resources.aircrafts.some((item) => item.uuid === uuid),
        ) &&
        (!data.locationUuid ||
            resources.locations.some((item) => item.uuid === data.locationUuid))
    );
}

type ResolvedJumpResources = {
    locationUuid: string | null;
    aircraftUuids: string[];
    gearUuids: string[];
    jumpTypeUuids: string[];
};

export async function parseAndResolveJumpForm(
    c: AppRequestContext,
    formData: FormData,
): Promise<
    | {
          ok: true;
          raw: JumpFormValues;
          data: z.infer<typeof JumpSchema>;
          resources: JumpFormResources;
          resolved: ResolvedJumpResources;
      }
    | {
          ok: false;
          raw: JumpFormValues;
          resources: JumpFormResources;
          errors: (string | ReturnType<typeof duplicateJumpNumberError>)[];
      }
> {
    const raw = getJumpFormValues(formData);
    const result = JumpSchema.safeParse(raw);
    const resources = await getJumpFormResources(c);
    if (!result.success) {
        return {
            ok: false,
            raw,
            resources,
            errors: result.error.issues.map((issue) => issue.message),
        };
    }
    if (!selectedJumpItemsAreOwned(resources, result.data)) {
        return {
            ok: false,
            raw,
            resources,
            errors: [
                "Choose locations, aircraft, gear, and jump types from your logbook",
            ],
        };
    }
    const resolved = await resolveJumpResources(c, result.data, resources);
    if (!resolved.ok) {
        return {
            ok: false,
            raw,
            resources,
            errors: [resolved.error],
        };
    }
    if (!ownsJumpResources(resources, resolved)) {
        return {
            ok: false,
            raw,
            resources,
            errors: [
                "Choose locations, aircraft, gear, and jump types from your logbook",
            ],
        };
    }
    return {
        ok: true,
        raw,
        data: result.data,
        resources,
        resolved,
    };
}

function normalizeJumpItemName(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function splitJumpItemNames(value: string): string[] {
    if (!value.trim()) {
        return [];
    }
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function findJumpItemByName(
    resources: { uuid: string; name: string }[],
    name: string,
): { uuid: string; name: string } | undefined {
    const target = normalizeJumpItemName(name);
    return resources.find(
        (item) => normalizeJumpItemName(item.name) === target,
    );
}

async function resolveJumpItemUuid(options: {
    resources: { uuid: string; name: string }[];
    name: string;
    create: (name: string) => Promise<string>;
}): Promise<string> {
    const existing = findJumpItemByName(options.resources, options.name);
    if (existing) {
        return existing.uuid;
    }
    return options.create(options.name.trim());
}

async function resolveJumpResources(
    c: AppRequestContext,
    data: z.infer<typeof JumpSchema>,
    resources: JumpFormResources,
): Promise<
    | {
          ok: true;
          locationUuid: string | null;
          aircraftUuids: string[];
          gearUuids: string[];
          jumpTypeUuids: string[];
      }
    | { ok: false; error: string }
> {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;

    let locationUuid = data.locationUuid;
    if (data.locationName) {
        locationUuid = await resolveJumpItemUuid({
            resources: resources.locations,
            name: data.locationName,
            create: async (name) => {
                const uuid = crypto.randomUUID();
                await db.insert(locations).values({
                    uuid,
                    userUuid,
                    name,
                    previousJumpCount: 0,
                });
                resources.locations.push({
                    uuid,
                    name,
                    archived: false,
                    description: null,
                });
                return uuid;
            },
        });
    }
    const aircraftUuids = new Set(data.aircraftUuids);
    for (const name of splitJumpItemNames(data.aircraftName)) {
        const uuid = await resolveJumpItemUuid({
            resources: resources.aircrafts,
            name,
            create: async (itemName) => {
                const uuid = crypto.randomUUID();
                await db.insert(aircrafts).values({
                    uuid,
                    userUuid,
                    name: itemName,
                    previousJumpCount: 0,
                });
                resources.aircrafts.push({
                    uuid,
                    name: itemName,
                    archived: false,
                    description: null,
                });
                return uuid;
            },
        });
        aircraftUuids.add(uuid);
    }
    const gearUuids = new Set(data.gearUuids);
    for (const name of splitJumpItemNames(data.gearName)) {
        const uuid = await resolveJumpItemUuid({
            resources: resources.gear,
            name,
            create: async (itemName) => {
                const newUuid = crypto.randomUUID();
                await db.insert(gear).values({
                    uuid: newUuid,
                    userUuid,
                    name: itemName,
                    previousUsageCount: 0,
                });
                resources.gear.push({
                    uuid: newUuid,
                    name: itemName,
                    archived: false,
                    description: null,
                });
                return newUuid;
            },
        });
        gearUuids.add(uuid);
    }

    const jumpTypeUuids = new Set(data.jumpTypeUuids);
    for (const name of splitJumpItemNames(data.jumpTypeName)) {
        const uuid = await resolveJumpItemUuid({
            resources: resources.jumpTypes,
            name,
            create: async (itemName) => {
                const newUuid = crypto.randomUUID();
                await db.insert(jumpTypes).values({
                    uuid: newUuid,
                    userUuid,
                    name: itemName,
                    previousUsageCount: 0,
                });
                resources.jumpTypes.push({
                    uuid: newUuid,
                    name: itemName,
                    archived: false,
                    description: null,
                });
                return newUuid;
            },
        });
        jumpTypeUuids.add(uuid);
    }

    return {
        ok: true,
        locationUuid: locationUuid || null,
        aircraftUuids: [...aircraftUuids],
        gearUuids: [...gearUuids],
        jumpTypeUuids: [...jumpTypeUuids],
    };
}

export async function findJumpByNumber(
    c: AppRequestContext,
    jumpNumber: number,
    excludeUuid?: string,
) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    return db
        .select({ uuid: jumps.uuid })
        .from(jumps)
        .where(
            and(
                eq(jumps.userUuid, userUuid),
                eq(jumps.jumpNumber, jumpNumber),
                ...(excludeUuid ? [ne(jumps.uuid, excludeUuid)] : []),
            ),
        )
        .get();
}

export function duplicateJumpNumberError(
    jumpNumber: number,
    existingUuid: string,
) {
    return (
        <>
            Jump number {jumpNumber} is already used.{" "}
            <a
                href={routes.logbook.jumps.edit({ uuid: existingUuid })}
                className="font-medium underline"
            >
                Open existing jump
            </a>
        </>
    );
}
