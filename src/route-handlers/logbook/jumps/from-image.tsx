import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output, type LanguageModelUsage } from "ai";
import clsx from "clsx";
import { and, eq } from "drizzle-orm";
import { useId } from "hono/jsx";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import { ErrorList } from "@/components/feedback";
import { CameraIcon, ClipboardIcon } from "@/components/icons";
import {
    Button,
    fileInputClassName,
    Select,
    Textarea,
} from "@/components/form";
import {
    DEFAULT_JUMP_IMAGE_MODEL,
    JUMP_IMAGE_MODELS,
    altitudeInputValue,
    resolveJumpImageModel,
    type UserOptions,
} from "@/options";
import {
    DEFAULT_JUMP_IMAGE_PROMPT,
    JUMP_IMAGE_SYSTEM_PROMPT,
    JumpImageDataSchema,
    type JumpImageData,
    type JumpImageInput,
} from "@/jump-image";
import * as routes from "@/routes";
import { aircrafts, gear, jumpTypes, locations } from "@/schema";
import {
    AiUsageSummary,
    buildAiUsageTitle,
    getAiUsageForUser,
    recordAiUsage,
    type AiUsageRow,
    type AiUsageTotals,
} from "@/route-handlers/logbook/components/ai-usage";
import { ImageGallery } from "@/route-handlers/logbook/jumps/image-client";
import { LogbookPage } from "@/app/logbook-page";
import { ClearReturnRoute } from "@/components/return-after-form-post";

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
    return exact?.uuid;
}

function resolveResourceNames(
    resources: { uuid: string; name: string }[],
    names: string[] | null | undefined,
): { uuids: string[]; unmatchedNames: string[] } {
    if (!names?.length) {
        return { uuids: [], unmatchedNames: [] };
    }
    const uuids = new Set<string>();
    const unmatchedNames = new Map<string, string>();
    for (const name of names) {
        const uuid = findResourceUuid(resources, name);
        if (uuid) {
            uuids.add(uuid);
        } else {
            unmatchedNames.set(normalizeName(name), name.trim());
        }
    }
    return { uuids: [...uuids], unmatchedNames: [...unmatchedNames.values()] };
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

function JumpImageField(props: { formId: string }) {
    const inputId = useId();
    const uploadInputId = useId();
    const imageIdInputId = useId();
    const cameraInputId = useId();
    const cameraButtonId = useId();
    const clipboardButtonId = useId();

    return (
        <div className="space-y-2">
            <label
                htmlFor={inputId}
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
                Jump image
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                    id={inputId}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className={clsx(fileInputClassName, "min-w-0 flex-1")}
                />
                <input
                    id={uploadInputId}
                    type="file"
                    name="image"
                    required
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                />
                <input id={imageIdInputId} type="hidden" name="imageId" />
                <input
                    id={cameraInputId}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    capture="environment"
                    className="hidden"
                    tabIndex={-1}
                    aria-hidden="true"
                />
                <Button
                    type="button"
                    id={cameraButtonId}
                    variant="secondary"
                    className="shrink-0 gap-2 text-sm"
                    data-loki-tooltip="Take a photo with your camera"
                >
                    <CameraIcon className="h-4 w-4" />
                    Camera
                </Button>
                <Button
                    type="button"
                    id={clipboardButtonId}
                    variant="secondary"
                    className="shrink-0 gap-2 text-sm"
                    data-loki-tooltip="Paste images from the clipboard"
                >
                    <ClipboardIcon className="h-4 w-4" />
                    Paste
                </Button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
                On Android, you can also share images to Loki directly from
                gallery apps when Loki is{" "}
                <a
                    href={routes.install({})}
                    className="font-medium text-sky-700 underline hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
                >
                    installed as an app
                </a>
                .
            </p>
            <ImageGallery
                inputId={inputId}
                uploadInputId={uploadInputId}
                imageIdInputId={imageIdInputId}
                formId={props.formId}
                cameraInputId={cameraInputId}
                cameraButtonId={cameraButtonId}
                clipboardButtonId={clipboardButtonId}
            />
        </div>
    );
}

function JumpFromImagePage(props: {
    errors?: string[];
    hasApiKey: boolean;
    additionalContext: string;
    model: UserOptions["jumpImageModel"];
    usageTotals: AiUsageTotals;
    usageRows: AiUsageRow[];
}) {
    const formId = useId();

    return (
        <LogbookPage
            title="Read jump from image"
            mobileAction={
                <Button
                    type="submit"
                    form={formId}
                    variant="primary"
                    className="w-full"
                >
                    Read image
                </Button>
            }
        >
            {/* Edits opened from the image reader intentionally return to the
            logbook rather than treating the reader as a form return route. */}
            <ClearReturnRoute />
            <div className="space-y-6">
                <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            Read jump data from an image
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Upload a photo of a logbook page, altimeter, or
                            freefall computer. Review the extracted values on
                            the add jump form before saving.
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
                                href={`${routes.preferences({})}#openai`}
                                className="font-medium underline"
                            >
                                Preferences
                            </a>{" "}
                            before using this feature.
                        </p>
                    )}
                    <form
                        id={formId}
                        method="post"
                        encType="multipart/form-data"
                        className="space-y-5"
                    >
                        <JumpImageField formId={formId} />
                        <div className="space-y-1.5">
                            <Textarea
                                name="additionalContext"
                                label="Additional context"
                                rows={4}
                                value={props.additionalContext}
                                placeholder="Jump 41"
                                persist="jump-from-image-additional-context"
                            />
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Optional instructions for the AI. Use this to
                                specify which jump to pick if the image contains
                                multiple jumps, or to explain abbreviations
                                (e.g. RW means Formation Skydiving). Change the
                                default image reading prompt in{" "}
                                <a
                                    href={routes.preferences({})}
                                    className="font-medium text-indigo-600 underline dark:text-indigo-400"
                                >
                                    Preferences
                                </a>
                                .
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <Select
                                name="model"
                                label="AI model"
                                persist="jump-from-image-model"
                            >
                                {JUMP_IMAGE_MODELS.map((model) => (
                                    <option
                                        value={model.id}
                                        selected={model.id === props.model}
                                    >
                                        {model.label} — {model.description}
                                    </option>
                                ))}
                            </Select>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Prefills from your saved default. Change for
                                this read, or set the default in{" "}
                                <a
                                    href={routes.preferences({})}
                                    className="font-medium text-indigo-600 underline dark:text-indigo-400"
                                >
                                    Preferences
                                </a>
                                .
                            </p>
                        </div>
                        <div className="hidden sm:block">
                            <Button type="submit" variant="primary">
                                Read image
                            </Button>
                        </div>
                    </form>
                </section>
                <AiUsageSummary
                    totals={props.usageTotals}
                    rows={props.usageRows}
                />
            </div>
        </LogbookPage>
    );
}

async function renderJumpFromImage(
    c: AppRequestContext,
    options?: {
        errors?: string[];
        additionalContext?: string;
        model?: UserOptions["jumpImageModel"];
    },
) {
    const userOptions = getAppContext(c).getUser().options;
    const hasApiKey = Boolean(userOptions.openaiApiKey.trim());
    const model =
        options?.model ??
        userOptions.jumpImageModel ??
        DEFAULT_JUMP_IMAGE_MODEL;
    const usage = await getAiUsageForUser(c);
    return c.render(
        <JumpFromImagePage
            errors={options?.errors}
            hasApiKey={hasApiKey}
            additionalContext={options?.additionalContext ?? ""}
            model={model}
            usageTotals={usage.totals}
            usageRows={usage.rows}
        />,
    );
}

const PLAYWRIGHT_MOCK_JUMP_DATA: JumpImageInput = {
    error: null,
    warning: null,
    jumpDate: "2024-06-15",
    jumpNumber: 42,
    exitAltitude: { value: 13_123, unit: "feet" },
    openingAltitude: { value: 3_937, unit: "feet" },
    freefallTime: 50,
    location: "Image Drop Zone",
    aircraft: ["Image Plane"],
    gear: ["Image Canopy"],
    jumpType: ["FS"],
    description: "From image mock",
};

const PLAYWRIGHT_MOCK_USAGE: LanguageModelUsage = {
    inputTokens: 1200,
    inputTokenDetails: {
        noCacheTokens: 1200,
        cacheReadTokens: undefined,
        cacheWriteTokens: undefined,
    },
    outputTokens: 180,
    outputTokenDetails: {
        textTokens: 180,
        reasoningTokens: undefined,
    },
    totalTokens: 1380,
};

function isPlaywrightTest(): boolean {
    return process.env.PLAYWRIGHT_TEST === "1";
}

function applyOpeningAltitudeFallback(
    data: JumpImageData,
    altitudeUnits: UserOptions["altitudeUnits"],
): JumpImageData {
    if (data.error) {
        return data;
    }
    return {
        ...data,
        openingAltitude:
            data.openingAltitude ?? (altitudeUnits === "feet" ? 3000 : 900),
    };
}

function getPlaywrightMockJumpData(additionalContext: string): JumpImageInput {
    if (additionalContext === "Mock ambiguous jump") {
        return {
            error: "Multiple jumps are visible. Specify the requested jump number in Additional context.",
            warning: null,
            jumpDate: null,
            jumpNumber: null,
            exitAltitude: null,
            openingAltitude: null,
            freefallTime: null,
            location: null,
            aircraft: null,
            gear: null,
            jumpType: null,
            description: null,
        };
    }
    if (additionalContext === "Mock uncertain reading") {
        return {
            ...PLAYWRIGHT_MOCK_JUMP_DATA,
            warning:
                "Opening altitude was difficult to read and may be inaccurate.",
        };
    }
    if (additionalContext === "Mock unreadable required fields") {
        return {
            ...PLAYWRIGHT_MOCK_JUMP_DATA,
            jumpDate: null,
            jumpNumber: null,
            openingAltitude: null,
            location: null,
            aircraft: null,
            gear: null,
            jumpType: null,
        };
    }
    if (additionalContext === "Mock multiple jump items") {
        return {
            ...PLAYWRIGHT_MOCK_JUMP_DATA,
            aircraft: ["Image Plane", "OH-NEW"],
            gear: ["Image Canopy", "Altimeter"],
            jumpType: ["FS", "Image Special"],
        };
    }
    return PLAYWRIGHT_MOCK_JUMP_DATA;
}

async function extractJumpDataFromImage(options: {
    apiKey: string;
    model: UserOptions["jumpImageModel"];
    prompt: string;
    additionalContext: string;
    altitudeUnits: UserOptions["altitudeUnits"];
    image: Uint8Array;
    mediaType: string;
    resources: Awaited<ReturnType<typeof getJumpItemResources>>;
}): Promise<{ data: JumpImageData; usage: LanguageModelUsage }> {
    if (isPlaywrightTest()) {
        return {
            data: applyOpeningAltitudeFallback(
                JumpImageDataSchema.parse(
                    getPlaywrightMockJumpData(options.additionalContext),
                ),
                options.altitudeUnits,
            ),
            usage: PLAYWRIGHT_MOCK_USAGE,
        };
    }

    const openai = createOpenAI({ apiKey: options.apiKey });
    const prompt = options.prompt.trim() || DEFAULT_JUMP_IMAGE_PROMPT;
    const userText = [
        `User's image reading instructions:\n${prompt}`,
        "Extract exitAltitude and openingAltitude as their visible values and source units. Supported source units are meters and feet. Do not convert them. If a source unit is not explicit in the image or supplied in the user's additional context, return null for that altitude.",
        "Match a readable name to one of these existing logbook items only when the match is unambiguous. If none matches, return the readable name from the image so a new jump item can be created:",
        buildResourceHint("Locations", options.resources.locations),
        buildResourceHint("Aircraft", options.resources.aircrafts),
        buildResourceHint("Gear", options.resources.gear),
        buildResourceHint("Jump types", options.resources.jumpTypes),
        options.additionalContext.trim()
            ? `Additional context from the user:\n${options.additionalContext.trim()}`
            : "",
    ]
        .filter(Boolean)
        .join("\n");

    const { output, usage } = await generateText({
        model: openai(options.model),
        reasoning: "low",
        output: Output.object({
            schema: JumpImageDataSchema,
            name: "jumpData",
            description: "Skydiving jump data extracted from an image",
        }),
        system: JUMP_IMAGE_SYSTEM_PROMPT,
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
    return {
        data: applyOpeningAltitudeFallback(output, options.altitudeUnits),
        usage,
    };
}

function buildJumpNewQuery(
    data: JumpImageData,
    resources: Awaited<ReturnType<typeof getJumpItemResources>>,
    options: {
        imageId: string | undefined;
        altitudeUnits: UserOptions["altitudeUnits"];
    },
) {
    const locationUuid = findResourceUuid(resources.locations, data.location);
    const aircraft = resolveResourceNames(resources.aircrafts, data.aircraft);
    const gearItems = resolveResourceNames(resources.gear, data.gear);
    const jumpTypeItems = resolveResourceNames(
        resources.jumpTypes,
        data.jumpType,
    );

    return {
        fromImage: "1",
        imageId: options.imageId,
        jumpDate: data.jumpDate ?? undefined,
        jumpNumber:
            data.jumpNumber != null ? String(data.jumpNumber) : undefined,
        exitAltitude:
            data.exitAltitude != null
                ? altitudeInputValue(data.exitAltitude, options.altitudeUnits)
                : undefined,
        openingAltitude:
            data.openingAltitude != null
                ? altitudeInputValue(
                      data.openingAltitude,
                      options.altitudeUnits,
                  )
                : undefined,
        freefallTime:
            data.freefallTime != null ? String(data.freefallTime) : undefined,
        locationUuid,
        aircraftUuids:
            aircraft.uuids.length > 0 ? aircraft.uuids.join(",") : undefined,
        gearUuids:
            gearItems.uuids.length > 0 ? gearItems.uuids.join(",") : undefined,
        jumpTypeUuids:
            jumpTypeItems.uuids.length > 0
                ? jumpTypeItems.uuids.join(",")
                : undefined,
        locationName: locationUuid
            ? undefined
            : data.location?.trim() || undefined,
        aircraftName:
            aircraft.unmatchedNames.length > 0
                ? aircraft.unmatchedNames.join("; ")
                : undefined,
        gearName:
            gearItems.unmatchedNames.length > 0
                ? gearItems.unmatchedNames.join("; ")
                : undefined,
        jumpTypeName:
            jumpTypeItems.unmatchedNames.length > 0
                ? jumpTypeItems.unmatchedNames.join("; ")
                : undefined,
        description: data.description ?? undefined,
        warning: data.warning ?? undefined,
    };
}

async function handleJumpFromImage(c: AppRequestContext) {
    const options = getAppContext(c).getUser().options;
    const apiKey = options.openaiApiKey.trim();
    const formData = await c.req.formData();
    const additionalContextField = formData.get("additionalContext");
    const additionalContext =
        typeof additionalContextField === "string"
            ? additionalContextField
            : "";
    const prompt = options.jumpImagePrompt || DEFAULT_JUMP_IMAGE_PROMPT;
    const model = resolveJumpImageModel(
        formData.get("model"),
        options.jumpImageModel ?? DEFAULT_JUMP_IMAGE_MODEL,
    );

    if (!apiKey) {
        return renderJumpFromImage(c, {
            errors: [
                "Add an OpenAI API key in Preferences before reading an image.",
            ],
            additionalContext,
            model,
        });
    }

    const image = formData.get("image");
    const imageIdField = formData.get("imageId");
    const imageId =
        typeof imageIdField === "string" && imageIdField.trim()
            ? imageIdField
            : undefined;
    if (!(image instanceof File) || image.size === 0) {
        return renderJumpFromImage(c, {
            errors: ["Choose an image to upload."],
            additionalContext,
            model,
        });
    }
    if (image.size > MAX_IMAGE_BYTES) {
        return renderJumpFromImage(c, {
            errors: ["Image is too large. Maximum size is 8 MB."],
            additionalContext,
            model,
        });
    }
    const mediaType = image.type || "image/jpeg";
    if (!ALLOWED_IMAGE_TYPES.has(mediaType)) {
        return renderJumpFromImage(c, {
            errors: ["Unsupported image type. Use JPEG, PNG, WebP, or GIF."],
            additionalContext,
            model,
        });
    }

    const resources = await getJumpItemResources(c);
    try {
        const bytes = new Uint8Array(await image.arrayBuffer());
        const { data, usage } = await extractJumpDataFromImage({
            apiKey,
            model,
            prompt,
            additionalContext,
            altitudeUnits: options.altitudeUnits,
            image: bytes,
            mediaType,
            resources,
        });
        await recordAiUsage({
            c,
            model,
            title: buildAiUsageTitle(data),
            usage,
        });
        if (data.error) {
            return renderJumpFromImage(c, {
                errors: [data.error],
                additionalContext,
                model,
            });
        }
        return c.redirect(
            routes.logbook.jumps.new(
                {},
                buildJumpNewQuery(data, resources, {
                    imageId,
                    altitudeUnits: options.altitudeUnits,
                }),
            ),
        );
    } catch (error) {
        console.error("Failed to extract jump data from the image", error);
        const message =
            error instanceof Error
                ? error.message
                : "Failed to read jump data from the image";
        return renderJumpFromImage(c, {
            errors: [message],
            additionalContext,
            model,
        });
    }
}

export function register(app: App) {
    app.get(routes.logbook.jumps.fromImage.route, async (c) =>
        renderJumpFromImage(c),
    );
    app.post(routes.logbook.jumps.fromImage.route, handleJumpFromImage);
}
