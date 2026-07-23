import { z } from "zod";
import { METERS_PER_FOOT } from "@/altitude";
import { DEFAULT_JUMP_IMAGE_PROMPT } from "@/jump-image";

export { altitudeToMeters } from "@/altitude";

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

export const DEFAULT_USER_OPTIONS = {
    altitudeUnits: "meters",
    speedUnits: "kilometers-per-hour",
    dateTimeFormat: "iso",
    numberFormat: "space-comma",
    openaiApiKey: "",
    jumpImagePrompt: DEFAULT_JUMP_IMAGE_PROMPT,
    jumpImageModel: DEFAULT_JUMP_IMAGE_MODEL,
    jumpImageAdditionalContext: "",
    htmlCacheEnabled: true,
    privacyPolicyAccepted: false,
    readonly: false,
    exampleDataChecksum: "",
    lastCsvExportAt: "",
} as const;

export const UserOptionsSchema = z.object({
    altitudeUnits: z.enum(["meters", "feet"]).default("meters"),
    speedUnits: z
        .enum(["kilometers-per-hour", "miles-per-hour", "meters-per-second"])
        .default("kilometers-per-hour"),
    dateTimeFormat: z
        .enum(["finnish", "european", "american", "iso"])
        .default("iso"),
    numberFormat: z
        .enum(["space-comma", "period-comma", "comma-period"])
        .default("space-comma"),
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
    htmlCacheEnabled: z.boolean().default(true),
    privacyPolicyAccepted: z.boolean().default(false),
    /** Only admins may change this; user preferences never write it. */
    readonly: z.boolean().default(false),
    /** SHA-256 of the last imported example CSV; demo import skips when equal. */
    exampleDataChecksum: z.string().default(""),
    /** ISO timestamp of the last successful CSV export. */
    lastCsvExportAt: z.string().datetime().or(z.literal("")).default(""),
});

export type UserOptions = z.output<typeof UserOptionsSchema>;

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
        return UserOptionsSchema.parse({});
    }

    try {
        const result = UserOptionsSchema.safeParse(JSON.parse(value));
        return result.success ? result.data : UserOptionsSchema.parse({});
    } catch (error) {
        console.error("Failed to parse stored user options", error);
        return UserOptionsSchema.parse({});
    }
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
