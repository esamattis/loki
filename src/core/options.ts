import { z } from "zod";

/** Validates date time format values. */
export const DateTimeFormatSchema = z.enum([
    "finnish",
    "european",
    "american",
    "iso",
]);
/** Validates number format values. */
export const NumberFormatSchema = z.enum([
    "space-comma",
    "period-comma",
    "comma-period",
]);

/** Validates core user options values. */
export const CoreUserOptionsSchema = z
    .object({
        dateTimeFormat: DateTimeFormatSchema.default("iso"),
        numberFormat: NumberFormatSchema.default("space-comma"),
        htmlCacheEnabled: z.boolean().default(true),
        privacyPolicyAccepted: z.boolean().default(false),
        readonly: z.boolean().default(false),
    })
    .passthrough();

/** Describes core user options. */
export type CoreUserOptions = z.output<typeof CoreUserOptionsSchema>;

/** Returns a valid option value or its default without affecting other fields. */
function parseOption<T>(schema: z.ZodType<T>, value: unknown, fallback: T): T {
    const result = schema.safeParse(value);
    return result.success ? result.data : fallback;
}

/** Parses core user options. */
export function parseCoreUserOptions(value: string | null): CoreUserOptions {
    if (!value) return CoreUserOptionsSchema.parse({});
    try {
        const parsed: unknown = JSON.parse(value);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return CoreUserOptionsSchema.parse({});
        }
        const record = z.record(z.string(), z.unknown()).safeParse(parsed);
        if (!record.success) return CoreUserOptionsSchema.parse({});
        const options = record.data;
        const defaults = CoreUserOptionsSchema.parse({});
        return CoreUserOptionsSchema.parse({
            ...options,
            dateTimeFormat: parseOption(
                DateTimeFormatSchema,
                options.dateTimeFormat,
                defaults.dateTimeFormat,
            ),
            numberFormat: parseOption(
                NumberFormatSchema,
                options.numberFormat,
                defaults.numberFormat,
            ),
            htmlCacheEnabled: parseOption(
                z.boolean(),
                options.htmlCacheEnabled,
                defaults.htmlCacheEnabled,
            ),
            privacyPolicyAccepted: parseOption(
                z.boolean(),
                options.privacyPolicyAccepted,
                defaults.privacyPolicyAccepted,
            ),
            readonly: parseOption(
                z.boolean(),
                options.readonly,
                defaults.readonly,
            ),
        });
    } catch (error) {
        console.error("Failed to parse stored user options", error);
        return CoreUserOptionsSchema.parse({});
    }
}
