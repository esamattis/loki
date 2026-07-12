import { z } from "zod/v4";

export const DEFAULT_USER_OPTIONS = {
    altitudeUnits: "meters",
    speedUnits: "kilometers-per-hour",
    previousJumpCount: 0,
} as const;

export const UserOptionsSchema = z.object({
    altitudeUnits: z.enum(["meters", "feet"]).default("meters"),
    speedUnits: z
        .enum(["kilometers-per-hour", "meters-per-second"])
        .default("kilometers-per-hour"),
    previousJumpCount: z.coerce.number().int().nonnegative().default(0),
});

export type UserOptions = z.output<typeof UserOptionsSchema>;

export const DEFAULT_USER_OPTIONS_JSON = JSON.stringify(DEFAULT_USER_OPTIONS);

const METERS_PER_FOOT = 0.3048;

export function parseUserOptions(value: string | null): UserOptions {
    if (!value) {
        return UserOptionsSchema.parse({});
    }

    try {
        const result = UserOptionsSchema.safeParse(JSON.parse(value));
        return result.success ? result.data : UserOptionsSchema.parse({});
    } catch {
        return UserOptionsSchema.parse({});
    }
}

export function formatAltitude(
    meters: number,
    units: UserOptions["altitudeUnits"],
): string {
    if (units === "feet") {
        return `${Math.round(meters / METERS_PER_FOOT)} ft`;
    }
    return `${meters} m`;
}

export function altitudeInputValue(
    meters: number,
    units: UserOptions["altitudeUnits"],
): string {
    if (units === "feet") {
        return String(Math.round(meters / METERS_PER_FOOT));
    }
    return String(meters);
}

export function altitudeToMeters(
    altitude: number,
    units: UserOptions["altitudeUnits"],
): number {
    if (units === "feet") {
        return Math.round(altitude * METERS_PER_FOOT);
    }
    return Math.round(altitude);
}

export function altitudeUnitLabel(units: UserOptions["altitudeUnits"]): string {
    return units === "feet" ? "ft" : "m";
}
