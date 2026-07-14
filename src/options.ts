import { z } from "zod";

export const DEFAULT_JUMP_IMAGE_PROMPT = `Extract skydiving jump data from this image (logbook page, altimeter screenshot, freefall computer, or handwritten notes).

Return only values that are clearly visible or confidently readable.
- jumpDate as YYYY-MM-DD when a date is present
- exitAltitude and openingAltitude as whole numbers in the unit specified in the user message
- if openingAltitude is not found or unclear, use 900
- freefallTime in whole seconds
- location, aircraft, gear, and jump types as short names when present
- "WS" refers to jump type of "Wingsuit"
- "Delay" refers to freefall fime
- description for any other useful notes (weather, formation, instructors, etc.). Add description even if it is just a single word.
- If a field is missing or unclear, omit it (except openingAltitude, which defaults to 900).`;

/** Vision-capable OpenAI models suited to structured logbook image extraction. */
export const JUMP_IMAGE_MODEL_IDS = [
    "gpt-5.6",
    "gpt-5.6-terra",
    "gpt-5.6-luna",
    "gpt-4o",
    "gpt-4o-mini",
] as const;

export type JumpImageModelId = (typeof JUMP_IMAGE_MODEL_IDS)[number];

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
    previousJumpCount: 0,
    openaiApiKey: "",
    jumpImagePrompt: DEFAULT_JUMP_IMAGE_PROMPT,
    jumpImageModel: DEFAULT_JUMP_IMAGE_MODEL,
} as const;

export const UserOptionsSchema = z.object({
    altitudeUnits: z.enum(["meters", "feet"]).default("meters"),
    speedUnits: z
        .enum(["kilometers-per-hour", "miles-per-hour", "meters-per-second"])
        .default("kilometers-per-hour"),
    previousJumpCount: z.coerce.number().int().nonnegative().default(0),
    openaiApiKey: z.string().default(""),
    jumpImagePrompt: z.string().default(DEFAULT_JUMP_IMAGE_PROMPT),
    jumpImageModel: z
        .enum(JUMP_IMAGE_MODEL_IDS)
        .default(DEFAULT_JUMP_IMAGE_MODEL),
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
    } catch (error) {
        console.error("Failed to parse stored user options", error);
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

export function formatSpeed(
    metersPerSecond: number,
    units: UserOptions["speedUnits"],
): string {
    if (units === "meters-per-second") {
        return `${metersPerSecond.toFixed(1).replace(/\.0$/, "")} m/s`;
    }
    return `${Math.round(metersPerSecond * speedConversionFactor(units))} ${speedUnitLabel(units)}`;
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
