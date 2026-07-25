import { z } from "zod";

export const DateTimeFormatSchema = z.enum([
    "finnish",
    "european",
    "american",
    "iso",
]);
export const NumberFormatSchema = z.enum([
    "space-comma",
    "period-comma",
    "comma-period",
]);

export const CoreUserOptionsSchema = z
    .object({
        dateTimeFormat: DateTimeFormatSchema.default("iso"),
        numberFormat: NumberFormatSchema.default("space-comma"),
        htmlCacheEnabled: z.boolean().default(true),
        privacyPolicyAccepted: z.boolean().default(false),
        readonly: z.boolean().default(false),
    })
    .passthrough();

export type CoreUserOptions = z.output<typeof CoreUserOptionsSchema> &
    Record<string, any>;

export function parseCoreUserOptions(value: string | null): CoreUserOptions {
    if (!value) return CoreUserOptionsSchema.parse({});
    try {
        const result = CoreUserOptionsSchema.safeParse(JSON.parse(value));
        return result.success ? result.data : CoreUserOptionsSchema.parse({});
    } catch (error) {
        console.error("Failed to parse stored user options", error);
        return CoreUserOptionsSchema.parse({});
    }
}
