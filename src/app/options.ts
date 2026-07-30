import { z } from "zod";
import { METERS_PER_FOOT } from "./altitude.ts";
import { DEFAULT_JUMP_IMAGE_PROMPT } from "./jump-image.ts";
import { CoreUserOptionsSchema } from "../core/options.ts";

export { altitudeToMeters } from "./altitude.ts";

/** Vision-capable OpenAI models suited to structured logbook image extraction. */
export const JUMP_IMAGE_MODEL_IDS = [
    "gpt-5.6",
    "gpt-5.6-terra",
    "gpt-5.6-luna",
    "gpt-4o",
    "gpt-4o-mini",
] as const;

export type JumpImageModelId = (typeof JUMP_IMAGE_MODEL_IDS)[number];

export const JUMP_IMAGE_ADDITIONAL_CONTEXT_MAX = 500;

export const JUMP_IMAGE_MODELS: {
    id: JumpImageModelId;
    label: string;
    description: string;
}[] = [
    {
        id: "gpt-5.6",
        label: "GPT-5.6 Sol",
        description: "Best quality for hard-to-read images",
    },
    {
        id: "gpt-5.6-terra",
        label: "GPT-5.6 Terra",
        description: "Balanced quality and cost",
    },
    {
        id: "gpt-5.6-luna",
        label: "GPT-5.6 Luna",
        description: "Faster and cheaper",
    },
    {
        id: "gpt-4o",
        label: "GPT-4o",
        description: "Previous generation, strong vision",
    },
    {
        id: "gpt-4o-mini",
        label: "GPT-4o mini",
        description: "Low-cost previous generation",
    },
];

export const DEFAULT_JUMP_IMAGE_MODEL: JumpImageModelId = "gpt-5.6-luna";

export function resolveJumpImageModel(
    value: unknown,
    fallback: JumpImageModelId = DEFAULT_JUMP_IMAGE_MODEL,
): JumpImageModelId {
    if (typeof value !== "string") {
        return fallback;
    }
    for (const id of JUMP_IMAGE_MODEL_IDS) {
        if (id === value) {
            return id;
        }
    }
    return fallback;
}

export const LokiUserOptionsSchema = CoreUserOptionsSchema.extend({
    altitudeUnits: z.enum(["meters", "feet"]).default("meters"),
    speedUnits: z
        .enum(["kilometers-per-hour", "miles-per-hour", "meters-per-second"])
        .default("kilometers-per-hour"),
    openaiApiKey: z.string().default(""),
    jumpImagePrompt: z.string().default(DEFAULT_JUMP_IMAGE_PROMPT),
    jumpImageModel: z
        .enum(JUMP_IMAGE_MODEL_IDS)
        .default(DEFAULT_JUMP_IMAGE_MODEL),
    jumpImageAdditionalContext: z
        .string()
        .max(
            JUMP_IMAGE_ADDITIONAL_CONTEXT_MAX,
            "Additional context must be 500 characters or fewer.",
        )
        .default(""),
    /** SHA-256 of the last imported example CSV; demo import skips when equal. */
    exampleDataChecksum: z.string().default(""),
    /** ISO timestamp of the last successful CSV export. */
    lastCsvExportAt: z.string().datetime().or(z.literal("")).default(""),
});

export type UserOptions = z.output<typeof LokiUserOptionsSchema>;
export const UserOptionsSchema = LokiUserOptionsSchema;
export const DEFAULT_USER_OPTIONS: UserOptions = LokiUserOptionsSchema.parse(
    {},
);

export async function updateLokiOptions(
    user: import("@/core/user").User,
    updates: Partial<UserOptions>,
): Promise<void> {
    const options = LokiUserOptionsSchema.parse({
        ...user.options,
        ...updates,
    });
    await user.replaceOptions(options);
}

export const DEFAULT_USER_OPTIONS_JSON = JSON.stringify(DEFAULT_USER_OPTIONS);

export function numberFormatLocale(
    format: UserOptions["numberFormat"],
): string {
    if (format === "space-comma") {
        return "fi-FI";
    }
    if (format === "period-comma") {
        return "de-DE";
    }
    return "en-US";
}

export function formatNumber(
    value: number,
    format: UserOptions["numberFormat"],
    options?: Intl.NumberFormatOptions,
): string {
    return value.toLocaleString(numberFormatLocale(format), options);
}

export function parseUserOptions(value: string | null): UserOptions {
    if (!value) {
        return LokiUserOptionsSchema.parse({});
    }

    try {
        const result = LokiUserOptionsSchema.safeParse(JSON.parse(value));
        return result.success ? result.data : LokiUserOptionsSchema.parse({});
    } catch (error) {
        console.error("Failed to parse stored user options", error);
        return LokiUserOptionsSchema.parse({});
    }
}

export function getLokiUserOptions(
    user: import("@/core/user").User,
): UserOptions {
    return LokiUserOptionsSchema.parse(user.options);
}

export function formatAltitude(
    meters: number,
    units: UserOptions["altitudeUnits"],
    numberFormat: UserOptions["numberFormat"],
): string {
    if (units === "feet") {
        return `${formatNumber(Math.round(meters / METERS_PER_FOOT), numberFormat)} ft`;
    }
    return `${formatNumber(meters, numberFormat)} m`;
}

export function altitudeInputValue(
    meters: number,
    units: UserOptions["altitudeUnits"],
): string {
    if (meters === 0) {
        return "";
    }
    if (units === "feet") {
        return String(Math.round(meters / METERS_PER_FOOT));
    }
    return String(meters);
}

export function altitudeUnitLabel(units: UserOptions["altitudeUnits"]): string {
    return units === "feet" ? "ft" : "m";
}

export function formatSpeed(
    metersPerSecond: number,
    units: UserOptions["speedUnits"],
    numberFormat: UserOptions["numberFormat"],
): string {
    if (units === "meters-per-second") {
        return `${formatNumber(metersPerSecond, numberFormat, { maximumFractionDigits: 1 })} m/s`;
    }
    return `${formatNumber(Math.round(metersPerSecond * speedConversionFactor(units)), numberFormat)} ${speedUnitLabel(units)}`;
}

export function speedConversionFactor(
    units: UserOptions["speedUnits"],
): number {
    if (units === "meters-per-second") {
        return 1;
    }
    return units === "miles-per-hour" ? 2.2369362920544 : 3.6;
}

export function speedInputValue(
    metersPerSecond: number,
    units: UserOptions["speedUnits"],
): string {
    const value = metersPerSecond * speedConversionFactor(units);
    return value.toFixed(1).replace(/\.0$/, "");
}

export function speedUnitLabel(units: UserOptions["speedUnits"]): string {
    if (units === "meters-per-second") {
        return "m/s";
    }
    return units === "miles-per-hour" ? "mph" : "km/h";
}
