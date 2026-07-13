import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { app, getAppContext, type AppRequestContext } from "../app";
import { ErrorList } from "../components/feedback";
import { FormActions, Textarea } from "../components/form";
import {
    DEFAULT_JUMP_IMAGE_PROMPT,
    altitudeUnitLabel,
    type UserOptions,
} from "../options";
import * as routes from "../routes";
import { aircrafts, gear, jumpTypes, locations } from "../schema";
import { LogbookPage } from "./layout";

const JumpImageDataSchema = z.object({
    jumpDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable()
        .describe("Jump date as YYYY-MM-DD, or null if not readable"),
    jumpNumber: z
        .number()
        .int()
        .positive()
        .nullable()
        .describe("Jump number if present, or null if not readable"),
    exitAltitude: z
        .number()
        .int()
        .positive()
        .nullable()
        .describe(
            "Exit altitude in the requested unit, or null if not readable",
        ),
    openingAltitude: z
        .number()
        .int()
        .min(0)
        .nullable()
        .describe(
            "Opening altitude in the requested unit, or null if not readable",
        ),
    freefallTime: z
        .number()
        .int()
        .min(0)
        .nullable()
        .describe("Freefall time in whole seconds, or null if not readable"),
    location: z
        .string()
        .nullable()
        .describe("Drop zone or location name, or null if not readable"),
    aircraft: z
        .string()
        .nullable()
        .describe("Aircraft name, or null if not readable"),
    gear: z
        .array(z.string())
        .nullable()
        .describe("Gear names used on the jump, or null if not readable"),
    jumpType: z
        .string()
        .nullable()
        .describe(
            "Single primary jump type or discipline name, or null if not readable",
        ),
    description: z
        .string()
        .nullable()
        .describe(
            "Any additional notes from the image, or null if not readable",
        ),
});

type JumpImageData = z.infer<typeof JumpImageDataSchema>;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
]);

function normalizeName(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function findResourceUuid(
    resources: { uuid: string; name: string }[],
    name: string | null | undefined,
): string | undefined {
    if (!name?.trim()) {
        return undefined;
    }
    const target = normalizeName(name);
    const exact = resources.find((item) => normalizeName(item.name) === target);
    if (exact) {
        return exact.uuid;
    }
    const partial = resources.find(
        (item) =>
            normalizeName(item.name).includes(target) ||
            target.includes(normalizeName(item.name)),
    );
    return partial?.uuid;
}

function findResourceUuids(
    resources: { uuid: string; name: string }[],
    names: string[] | null | undefined,
): string[] {
    if (!names?.length) {
        return [];
    }
    const uuids = new Set<string>();
    for (const name of names) {
        const uuid = findResourceUuid(resources, name);
        if (uuid) {
            uuids.add(uuid);
        }
    }
    return [...uuids];
}

async function getJumpItemResources(c: AppRequestContext) {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const [locationRows, aircraftRows, gearRows, jumpTypeRows] =
        await Promise.all([
            db
                .select({ uuid: locations.uuid, name: locations.name })
                .from(locations)
                .where(
                    and(
                        eq(locations.userUuid, userUuid),
                        eq(locations.archived, false),
                    ),
                )
                .orderBy(locations.name),
            db
                .select({ uuid: aircrafts.uuid, name: aircrafts.name })
                .from(aircrafts)
                .where(
                    and(
                        eq(aircrafts.userUuid, userUuid),
                        eq(aircrafts.archived, false),
                    ),
                )
                .orderBy(aircrafts.name),
            db
                .select({ uuid: gear.uuid, name: gear.name })
                .from(gear)
                .where(
                    and(eq(gear.userUuid, userUuid), eq(gear.archived, false)),
                )
                .orderBy(gear.name),
            db
                .select({ uuid: jumpTypes.uuid, name: jumpTypes.name })
                .from(jumpTypes)
                .where(
                    and(
                        eq(jumpTypes.userUuid, userUuid),
                        eq(jumpTypes.archived, false),
                    ),
                )
                .orderBy(jumpTypes.name),
        ]);

    return {
        locations: locationRows,
        aircrafts: aircraftRows,
        gear: gearRows,
        jumpTypes: jumpTypeRows,
    };
}

function buildResourceHint(label: string, items: { name: string }[]): string {
    if (items.length === 0) {
        return `${label}: (none configured)`;
    }
    return `${label}: ${items.map((item) => item.name).join(", ")}`;
}

function JumpFromImagePage(props: {
    errors?: string[];
    hasApiKey: boolean;
    prompt: string;
}) {
    return (
        <LogbookPage title="Add jump from image">
            <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Read jump data from an image
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Upload a photo of a logbook page, altimeter, or freefall
                        computer. Review the extracted values on the add jump
                        form before saving.
                    </p>
                </div>
                <ErrorList
                    errors={props.errors ?? []}
                    className="border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                />
                {!props.hasApiKey && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                        Add an OpenAI API key in{" "}
                        <a
                            href={routes.preferences({})}
                            className="font-medium underline"
                        >
                            Preferences
                        </a>{" "}
                        before using this feature.
                    </p>
                )}
                <form
                    method="post"
                    encType="multipart/form-data"
                    className="space-y-5"
                >
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Jump image
                        <input
                            type="file"
                            name="image"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            required
                            className="mt-1.5 block w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-700 file:mr-3 file:cursor-pointer file:rounded-l-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:file:bg-indigo-500 dark:hover:file:bg-indigo-600"
                        />
                    </label>
                    <div className="space-y-1.5">
                        <Textarea
                            name="prompt"
                            label="Image reading prompt"
                            rows={8}
                            defaultValue={props.prompt}
                        />
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Prefills from your saved prompt. Edit for this read,
                            or change the default in{" "}
                            <a
                                href={routes.preferences({})}
                                className="font-medium text-indigo-600 underline dark:text-indigo-400"
                            >
                                Preferences
                            </a>
                            .
                        </p>
                    </div>
                    <FormActions
                        submitLabel="Read image"
                        cancelHref={routes.logbook({})}
                    />
                </form>
            </section>
        </LogbookPage>
    );
}

function renderJumpFromImage(
    c: AppRequestContext,
    options?: { errors?: string[]; prompt?: string },
) {
    const userOptions = getAppContext(c).getUser().options;
    const hasApiKey = Boolean(userOptions.openaiApiKey.trim());
    const prompt =
        (options?.prompt ?? userOptions.jumpImagePrompt) ||
        DEFAULT_JUMP_IMAGE_PROMPT;
    return c.render(
        <JumpFromImagePage
            errors={options?.errors}
            hasApiKey={hasApiKey}
            prompt={prompt}
        />,
    );
}

const PLAYWRIGHT_MOCK_JUMP_DATA: JumpImageData = {
    jumpDate: "2024-06-15",
    jumpNumber: 42,
    exitAltitude: 4000,
    openingAltitude: 1200,
    freefallTime: 50,
    location: "Image Drop Zone",
    aircraft: "Image Plane",
    gear: ["Image Canopy"],
    jumpType: "FS",
    description: "From image mock",
};

function isPlaywrightTest(): boolean {
    return process.env.PLAYWRIGHT_TEST === "1";
}

async function extractJumpDataFromImage(options: {
    apiKey: string;
    prompt: string;
    altitudeUnits: UserOptions["altitudeUnits"];
    image: Uint8Array;
    mediaType: string;
    resources: Awaited<ReturnType<typeof getJumpItemResources>>;
}): Promise<JumpImageData> {
    if (isPlaywrightTest()) {
        return PLAYWRIGHT_MOCK_JUMP_DATA;
    }

    const openai = createOpenAI({ apiKey: options.apiKey });
    const unitLabel = altitudeUnitLabel(options.altitudeUnits);
    const systemPrompt = options.prompt.trim() || DEFAULT_JUMP_IMAGE_PROMPT;
    const userText = [
        `Altitude unit for exitAltitude and openingAltitude: ${options.altitudeUnits} (${unitLabel}).`,
        "Match names to these existing logbook items when possible:",
        buildResourceHint("Locations", options.resources.locations),
        buildResourceHint("Aircraft", options.resources.aircrafts),
        buildResourceHint("Gear", options.resources.gear),
        buildResourceHint("Jump types", options.resources.jumpTypes),
    ].join("\n");

    const { output } = await generateText({
        model: openai("gpt-4o"),
        output: Output.object({
            schema: JumpImageDataSchema,
            name: "jumpData",
            description: "Skydiving jump data extracted from an image",
        }),
        system: systemPrompt,
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: userText },
                    {
                        type: "file",
                        data: options.image,
                        mediaType: options.mediaType,
                    },
                ],
            },
        ],
    });

    if (!output) {
        throw new Error("No jump data was returned from the image");
    }
    return output;
}

function buildJumpNewQuery(
    data: JumpImageData,
    resources: Awaited<ReturnType<typeof getJumpItemResources>>,
) {
    const locationUuid = findResourceUuid(resources.locations, data.location);
    const aircraftUuid = findResourceUuid(resources.aircrafts, data.aircraft);
    const gearUuids = findResourceUuids(resources.gear, data.gear);
    const jumpTypeUuid = findResourceUuid(resources.jumpTypes, data.jumpType);
    const gearNames = (data.gear ?? [])
        .map((name) => name.trim())
        .filter(Boolean);

    return {
        jumpDate: data.jumpDate ?? undefined,
        jumpNumber:
            data.jumpNumber != null ? String(data.jumpNumber) : undefined,
        exitAltitude:
            data.exitAltitude != null ? String(data.exitAltitude) : undefined,
        openingAltitude:
            data.openingAltitude != null
                ? String(data.openingAltitude)
                : undefined,
        freefallTime:
            data.freefallTime != null ? String(data.freefallTime) : undefined,
        locationUuid,
        aircraftUuid,
        gearUuids: gearUuids.length > 0 ? gearUuids.join(",") : undefined,
        jumpTypeUuids: jumpTypeUuid,
        locationName: data.location?.trim() || undefined,
        aircraftName: data.aircraft?.trim() || undefined,
        gearName: gearNames.length > 0 ? gearNames.join(", ") : undefined,
        jumpTypeName: data.jumpType?.trim() || undefined,
        description: data.description ?? undefined,
    };
}

async function handleJumpFromImage(c: AppRequestContext) {
    const options = getAppContext(c).getUser().options;
    const apiKey = options.openaiApiKey.trim();
    const formData = await c.req.formData();
    const promptField = formData.get("prompt");
    const prompt =
        typeof promptField === "string"
            ? promptField.trim() || DEFAULT_JUMP_IMAGE_PROMPT
            : options.jumpImagePrompt || DEFAULT_JUMP_IMAGE_PROMPT;

    if (!apiKey) {
        return renderJumpFromImage(c, {
            errors: [
                "Add an OpenAI API key in Preferences before reading an image.",
            ],
            prompt,
        });
    }

    const image = formData.get("image");
    if (!(image instanceof File) || image.size === 0) {
        return renderJumpFromImage(c, {
            errors: ["Choose an image to upload."],
            prompt,
        });
    }
    if (image.size > MAX_IMAGE_BYTES) {
        return renderJumpFromImage(c, {
            errors: ["Image is too large. Maximum size is 8 MB."],
            prompt,
        });
    }
    const mediaType = image.type || "image/jpeg";
    if (!ALLOWED_IMAGE_TYPES.has(mediaType)) {
        return renderJumpFromImage(c, {
            errors: ["Unsupported image type. Use JPEG, PNG, WebP, or GIF."],
            prompt,
        });
    }

    const resources = await getJumpItemResources(c);
    try {
        const bytes = new Uint8Array(await image.arrayBuffer());
        const data = await extractJumpDataFromImage({
            apiKey,
            prompt,
            altitudeUnits: options.altitudeUnits,
            image: bytes,
            mediaType,
            resources,
        });
        return c.redirect(
            routes.jumpNew({}, buildJumpNewQuery(data, resources)),
        );
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to read jump data from the image";
        return renderJumpFromImage(c, { errors: [message], prompt });
    }
}

app.get(routes.jumpFromImage.route, (c) => renderJumpFromImage(c));
app.post(routes.jumpFromImage.route, handleJumpFromImage);
