import { useId } from "hono/jsx";
import { useAppContext } from "@/app/app";
import { Script } from "@/components/script";
import { $idb, $renderTemplate, $select } from "@/utils";
import * as routes from "@/routes";
import {
    $appendJumpImageDrafts,
    $loadImage,
    $loadJumpImageDrafts,
    $updateJumpImageDrafts,
    JUMP_IMAGE_KEY,
    JUMP_IMAGE_STORE,
    jumpImageDbName,
    type JumpImageDraft,
} from "@/route-handlers/logbook/jumps/image-storage-client";

export {
    JUMP_IMAGE_DB_NAME,
    JUMP_IMAGE_KEY,
    JUMP_IMAGE_STORE,
} from "@/route-handlers/logbook/jumps/image-storage-client";

export const JUMP_IMAGE_MAX_DIMENSION = 2048;
export const JUMP_IMAGE_TARGET_BYTES = 2 * 1024 * 1024;
interface JumpImageInputProps {
    inputId: string;
    uploadInputId: string;
    imageIdInputId: string;
    formId: string;
    cameraInputId: string;
    cameraButtonId: string;
    clipboardButtonId: string;
    clearAllButtonId: string;
    galleryId: string;
    metaId: string;
    resizeNoteId: string;
    galleryItemTemplateId: string;
    jumpLinkTemplateId: string;
    jumpEditUrlTemplate: string;
    maxDimension: number;
    targetBytes: number;
    dbName: string;
    storeName: string;
    storageKey: string;
}

export function ImageGallery(props: {
    inputId: string;
    uploadInputId: string;
    imageIdInputId: string;
    formId: string;
    cameraInputId: string;
    cameraButtonId: string;
    clipboardButtonId: string;
}) {
    const dbName = jumpImageDbName(useAppContext().getUser().uuid);
    const clearAllButtonId = useId();
    const galleryId = useId();
    const metaId = useId();
    const resizeNoteId = useId();
    const galleryItemTemplateId = useId();
    const jumpLinkTemplateId = useId();

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p
                    id={metaId}
                    className="hidden text-sm text-slate-500 dark:text-slate-400"
                />
                <button
                    type="button"
                    id={clearAllButtonId}
                    className="hidden text-sm font-medium text-red-700 underline hover:no-underline dark:text-red-400"
                >
                    Clear all images
                </button>
            </div>
            <div
                id={galleryId}
                className="hidden grid grid-cols-2 gap-3 md:grid-cols-3"
            />
            <p
                id={resizeNoteId}
                className="hidden rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200"
            />
            <template id={galleryItemTemplateId}>
                <div className="group relative min-w-0">
                    <button type="button" data-loki-select-image>
                        <img className="h-36 w-full rounded object-contain sm:h-44" />
                        <span
                            data-loki-read-image
                            className="absolute left-2 top-2 hidden rounded-full bg-emerald-700 px-2 py-1 text-xs font-semibold text-white shadow"
                        >
                            Read
                        </span>
                        <span
                            data-loki-template-slot="meta"
                            className="block truncate px-1 py-1 text-xs text-slate-600 dark:text-slate-300"
                        ></span>
                    </button>
                    <span
                        data-loki-created-jumps
                        className="hidden px-1 pb-2 text-xs text-indigo-700 dark:text-indigo-300"
                    >
                        Created: <span data-loki-created-jump-links />
                    </span>
                    <button
                        type="button"
                        data-loki-delete-image
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/75 text-sm font-bold text-white shadow hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                    >
                        X
                    </button>
                </div>
            </template>
            <template id={jumpLinkTemplateId}>
                <a
                    data-loki-template-slot="label"
                    className="font-semibold underline hover:no-underline"
                />
            </template>
            <Script
                $deps={[
                    $idb,
                    $select,
                    $renderTemplate,
                    $appendJumpImageDrafts,
                    $loadImage,
                    $loadJumpImageDrafts,
                    $updateJumpImageDrafts,
                    $resizeJumpImageIfNeeded,
                    $formatJumpImageBytes,
                    $getJumpImageElements,
                    $renderJumpImageGallery,
                    $prepareJumpImageFiles,
                    $setupCameraImageInput,
                    $setupClipboardImageInput,
                    $imageMimeTypeToExtension,
                    $setJumpImageUploadFile,
                    $setJumpImageProcessing,
                    $revokeJumpImagePreviewUrl,
                    $deleteJumpImageDraft,
                    $clearAllJumpImageDrafts,
                    $appendJumpImageFiles,
                    $createJumpImageGalleryController,
                ]}
                $args={[
                    {
                        inputId: props.inputId,
                        uploadInputId: props.uploadInputId,
                        imageIdInputId: props.imageIdInputId,
                        formId: props.formId,
                        cameraInputId: props.cameraInputId,
                        cameraButtonId: props.cameraButtonId,
                        clipboardButtonId: props.clipboardButtonId,
                        clearAllButtonId,
                        galleryId,
                        metaId,
                        resizeNoteId,
                        galleryItemTemplateId,
                        jumpLinkTemplateId,
                        jumpEditUrlTemplate: routes.logbook.jumps.edit({
                            uuid: "__JUMP_UUID__",
                        }),
                        maxDimension: JUMP_IMAGE_MAX_DIMENSION,
                        targetBytes: JUMP_IMAGE_TARGET_BYTES,
                        dbName,
                        storeName: JUMP_IMAGE_STORE,
                        storageKey: JUMP_IMAGE_KEY,
                    },
                ]}
                $exec={$initJumpImageInput}
            />
        </>
    );
}

export async function $resizeJumpImageIfNeeded(
    file: File,
    maxDimension: number,
    targetBytes: number,
): Promise<{
    file: File;
    originalWidth: number;
    originalHeight: number;
    width: number;
    height: number;
    resized: boolean;
}> {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const element = new Image();
        element.onload = () => {
            URL.revokeObjectURL(url);
            resolve(element);
        };
        element.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image for preview"));
        };
        element.src = url;
    });

    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const needsResize = longestSide > maxDimension || file.size > targetBytes;
    if (!needsResize) {
        return {
            file,
            originalWidth: image.naturalWidth,
            originalHeight: image.naturalHeight,
            width: image.naturalWidth,
            height: image.naturalHeight,
            resized: false,
        };
    }

    let width = image.naturalWidth;
    let height = image.naturalHeight;
    if (longestSide > maxDimension) {
        const scale = maxDimension / longestSide;
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
        return {
            file,
            originalWidth: image.naturalWidth,
            originalHeight: image.naturalHeight,
            width: image.naturalWidth,
            height: image.naturalHeight,
            resized: false,
        };
    }
    context.drawImage(image, 0, 0, width, height);

    const outputType =
        file.type === "image/png" || file.type === "image/webp"
            ? file.type
            : "image/jpeg";

    async function encode(quality: number): Promise<Blob> {
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error("Failed to encode image"));
                        return;
                    }
                    resolve(blob);
                },
                outputType,
                quality,
            );
        });
    }

    let quality = 0.92;
    let blob = await encode(quality);
    while (blob.size > targetBytes && quality > 0.5) {
        quality -= 0.1;
        blob = await encode(quality);
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "jump-image";
    const extension =
        outputType === "image/png"
            ? "png"
            : outputType === "image/webp"
              ? "webp"
              : "jpg";
    return {
        file: new File([blob], `${baseName}.${extension}`, {
            type: outputType,
            lastModified: Date.now(),
        }),
        originalWidth: image.naturalWidth,
        originalHeight: image.naturalHeight,
        width,
        height,
        resized: true,
    };
}

export function $formatJumpImageBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function $imageMimeTypeToExtension(mimeType: string): string {
    const sub = mimeType.split("/")[1] ?? "";
    if (sub === "jpeg") {
        return "jpg";
    }
    return sub || "img";
}

export function $setupClipboardImageInput(
    clipboardButton: HTMLButtonElement,
    handleSelectedFiles: (files: File[]) => void,
) {
    function makeClipboardImage(blob: Blob, mimeType: string) {
        const ext = $imageMimeTypeToExtension(mimeType);
        return new File([blob], `pasted-image.${ext}`, {
            type: mimeType,
            lastModified: Date.now(),
        });
    }

    clipboardButton.addEventListener("click", async () => {
        try {
            if (typeof navigator.clipboard?.read !== "function") {
                return;
            }
            const clipboardItems = await navigator.clipboard.read();
            const files: File[] = [];
            for (const item of clipboardItems) {
                const imageType = item.types.find((t) =>
                    t.startsWith("image/"),
                );
                if (imageType) {
                    const blob = await item.getType(imageType);
                    files.push(makeClipboardImage(blob, imageType));
                }
            }
            handleSelectedFiles(files);
        } catch (error) {
            console.error("Failed to read an image from the clipboard", error);
        }
    });

    window.addEventListener("paste", (event) => {
        const data = event.clipboardData;
        if (data == null) {
            return;
        }
        const target = event.target;
        if (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement
        ) {
            return;
        }
        const files: File[] = [];
        for (const item of data.items) {
            if (item.kind === "file" && item.type.startsWith("image/")) {
                const file = item.getAsFile();
                if (file) {
                    files.push(
                        makeClipboardImage(file, file.type || "image/png"),
                    );
                }
            }
        }
        if (files.length > 0) {
            event.preventDefault();
            handleSelectedFiles(files);
        }
    });
}

export function $setupCameraImageInput(
    cameraInput: HTMLInputElement,
    cameraButton: HTMLButtonElement,
    handleSelectedFiles: (files: File[]) => void,
) {
    cameraInput.addEventListener("change", () => {
        const files = Array.from(cameraInput.files ?? []);
        cameraInput.value = "";
        handleSelectedFiles(files);
    });
    cameraButton.addEventListener("click", () => cameraInput.click());
}

export function $getJumpImageElements(props: JumpImageInputProps) {
    const inputEl = $select.id(props.inputId, HTMLInputElement);
    const uploadInputEl = $select.id(props.uploadInputId, HTMLInputElement);
    const imageIdInputEl = $select.id(props.imageIdInputId, HTMLInputElement);
    const formEl = $select.id(props.formId, HTMLFormElement);
    const cameraInputEl = $select.id(props.cameraInputId, HTMLInputElement);
    const cameraButtonEl = $select.id(props.cameraButtonId, HTMLButtonElement);
    const clipboardButtonEl = $select.id(
        props.clipboardButtonId,
        HTMLButtonElement,
    );
    const clearAllButtonEl = $select.id(
        props.clearAllButtonId,
        HTMLButtonElement,
    );
    const galleryEl = $select.id(props.galleryId, HTMLElement);
    const metaEl = $select.id(props.metaId, HTMLElement);
    const resizeNoteEl = $select.id(props.resizeNoteId, HTMLElement);
    return {
        input: inputEl,
        uploadInput: uploadInputEl,
        imageIdInput: imageIdInputEl,
        form: formEl,
        cameraInput: cameraInputEl,
        cameraButton: cameraButtonEl,
        clipboardButton: clipboardButtonEl,
        clearAllButton: clearAllButtonEl,
        gallery: galleryEl,
        meta: metaEl,
        resizeNote: resizeNoteEl,
    };
}

export function $renderJumpImageGallery(options: {
    gallery: HTMLElement;
    meta: HTMLElement;
    clearAllButton: HTMLButtonElement;
    drafts: JumpImageDraft[];
    selectedId: string | null;
    previewUrls: Map<string, string>;
    templateId: string;
    jumpLinkTemplateId: string;
    jumpEditUrlTemplate: string;
    selectDraft: (id: string) => void;
    deleteDraft: (id: string) => void;
}) {
    options.gallery.replaceChildren();
    for (const draft of options.drafts) {
        let url = options.previewUrls.get(draft.id);
        if (!url) {
            url = URL.createObjectURL(draft.file);
            options.previewUrls.set(draft.id, url);
        }
        const selected = draft.id === options.selectedId;
        const selectClass = selected
            ? "block w-full overflow-hidden rounded-lg border-2 border-indigo-500 bg-indigo-50 p-1 text-left ring-2 ring-indigo-200 dark:bg-indigo-950/30 dark:ring-indigo-900"
            : "block w-full overflow-hidden rounded-lg border-2 border-transparent bg-slate-100 p-1 text-left hover:border-slate-300 dark:bg-slate-800 dark:hover:border-slate-600";
        const alt = selected
            ? "Selected jump image preview"
            : `Jump image preview: ${draft.file.name}`;
        const container = document.createElement("div");
        $renderTemplate(container, options.templateId, {
            meta: `${draft.file.name} · ${$formatJumpImageBytes(draft.file.size)}`,
        });
        const item = $select.el(":scope > *", HTMLElement, container);
        const selectButton = $select.el(
            "[data-loki-select-image]",
            HTMLButtonElement,
            item,
        );
        const image = $select.el("img", HTMLImageElement, item);
        const deleteButton = $select.el(
            "[data-loki-delete-image]",
            HTMLButtonElement,
            item,
        );
        const readIndicator = $select.el(
            "[data-loki-read-image]",
            HTMLElement,
            item,
        );
        const createdJumps = $select.el(
            "[data-loki-created-jumps]",
            HTMLElement,
            item,
        );
        const createdJumpLinks = $select.el(
            "[data-loki-created-jump-links]",
            HTMLElement,
            item,
        );
        selectButton.className = selectClass;
        selectButton.dataset.lokiSelectImage = draft.id;
        selectButton.setAttribute("aria-label", `Select ${draft.file.name}`);
        image.src = url;
        image.alt = alt;
        readIndicator.classList.toggle("hidden", !draft.read);
        for (const [index, jump] of draft.createdJumps.entries()) {
            const linkContainer = document.createElement("span");
            $renderTemplate(linkContainer, options.jumpLinkTemplateId, {
                label: `Jump #${jump.jumpNumber}`,
            });
            const link = $select.el(
                ":scope > *",
                HTMLAnchorElement,
                linkContainer,
            );
            link.href = options.jumpEditUrlTemplate.replace(
                "__JUMP_UUID__",
                encodeURIComponent(jump.uuid),
            );
            if (index > 0) {
                createdJumpLinks.appendChild(document.createTextNode(", "));
            }
            createdJumpLinks.appendChild(link);
        }
        createdJumps.classList.toggle(
            "hidden",
            draft.createdJumps.length === 0,
        );
        deleteButton.dataset.lokiDeleteImage = draft.id;
        deleteButton.setAttribute("aria-label", `Delete ${draft.file.name}`);
        options.gallery.appendChild(item);
    }
    for (const button of $select.all(
        "[data-loki-select-image]",
        HTMLButtonElement,
        options.gallery,
    )) {
        button.addEventListener("click", () => {
            options.selectDraft(button.dataset.lokiSelectImage ?? "");
        });
    }
    for (const button of $select.all(
        "[data-loki-delete-image]",
        HTMLButtonElement,
        options.gallery,
    )) {
        button.addEventListener("click", () => {
            options.deleteDraft(button.dataset.lokiDeleteImage ?? "");
        });
    }
    options.gallery.classList.toggle("hidden", options.drafts.length === 0);
    options.meta.textContent =
        options.drafts.length === 0
            ? ""
            : `${options.drafts.length} image${options.drafts.length === 1 ? "" : "s"}. Tap an image to select it for AI recognition.`;
    options.meta.classList.toggle("hidden", options.drafts.length === 0);
    options.clearAllButton.classList.toggle(
        "hidden",
        options.drafts.length === 0,
    );
}

export async function $prepareJumpImageFiles(
    files: File[],
    props: JumpImageInputProps,
) {
    const results = await Promise.all(
        files.map((file) =>
            $resizeJumpImageIfNeeded(
                file,
                props.maxDimension,
                props.targetBytes,
            ).then((result) => ({ original: file, result })),
        ),
    );
    const appended = await $appendJumpImageDrafts(
        {
            files: results.map((item) => item.result.file),
            dbName: props.dbName,
            storeName: props.storeName,
            storageKey: props.storageKey,
        },
        $idb,
    );
    const notes = results
        .filter((item) => item.result.resized)
        .map(
            (item) =>
                `Resized from ${$formatJumpImageBytes(item.original.size)} (${item.result.originalWidth} x ${item.result.originalHeight}) to ${$formatJumpImageBytes(item.result.file.size)} (${item.result.width} x ${item.result.height}).`,
        );
    return { appended, notes };
}

interface JumpImageGalleryState {
    drafts: JumpImageDraft[];
    selectedId: string | null;
    processingCount: number;
    previewUrls: Map<string, string>;
}

function $setJumpImageUploadFile(
    elements: ReturnType<typeof $getJumpImageElements>,
    state: JumpImageGalleryState,
    file: File | undefined,
) {
    const transfer = new DataTransfer();
    if (file) {
        transfer.items.add(file);
    }
    elements.uploadInput.files = transfer.files;
    elements.imageIdInput.value = file ? (state.selectedId ?? "") : "";
}

function $setJumpImageProcessing(
    elements: ReturnType<typeof $getJumpImageElements>,
    state: JumpImageGalleryState,
    value: boolean,
) {
    const submit = $select.el(
        'button[type="submit"]',
        HTMLButtonElement,
        elements.form,
    );
    state.processingCount += value ? 1 : -1;
    submit.disabled = state.processingCount > 0;
    if (state.processingCount > 0) {
        elements.form.setAttribute("aria-busy", "true");
    } else {
        elements.form.removeAttribute("aria-busy");
    }
}

function $revokeJumpImagePreviewUrl(state: JumpImageGalleryState, id: string) {
    const url = state.previewUrls.get(id);
    if (url) {
        URL.revokeObjectURL(url);
        state.previewUrls.delete(id);
    }
}

async function $deleteJumpImageDraft(options: {
    props: JumpImageInputProps;
    elements: ReturnType<typeof $getJumpImageElements>;
    state: JumpImageGalleryState;
    id: string;
    renderGalleryState: () => void;
}) {
    const remaining = options.state.drafts.filter(
        (item) => item.id !== options.id,
    );
    const nextSelectedId =
        options.state.selectedId === options.id
            ? (remaining[0]?.id ?? null)
            : options.state.selectedId;
    try {
        await $updateJumpImageDrafts({
            dbName: options.props.dbName,
            storeName: options.props.storeName,
            storageKey: options.props.storageKey,
            selectedId: nextSelectedId,
            deletedId: options.id,
        });
        options.state.drafts = remaining;
        options.state.selectedId = nextSelectedId;
        $setJumpImageUploadFile(
            options.elements,
            options.state,
            options.state.drafts.find(
                (item) => item.id === options.state.selectedId,
            )?.file,
        );
        $revokeJumpImagePreviewUrl(options.state, options.id);
        options.renderGalleryState();
    } catch (error) {
        console.error("Failed to delete the jump image", error);
    }
}

async function $clearAllJumpImageDrafts(options: {
    props: JumpImageInputProps;
    elements: ReturnType<typeof $getJumpImageElements>;
    state: JumpImageGalleryState;
    renderGalleryState: () => void;
}) {
    try {
        await $updateJumpImageDrafts({
            dbName: options.props.dbName,
            storeName: options.props.storeName,
            storageKey: options.props.storageKey,
            selectedId: null,
            clearAll: true,
        });
        for (const url of options.state.previewUrls.values()) {
            URL.revokeObjectURL(url);
        }
        options.state.previewUrls.clear();
        options.state.drafts = [];
        options.state.selectedId = null;
        $setJumpImageUploadFile(options.elements, options.state, undefined);
        options.elements.resizeNote.textContent = "";
        options.elements.resizeNote.classList.add("hidden");
        options.renderGalleryState();
    } catch (error) {
        console.error("Failed to clear jump images", error);
    }
}

async function $appendJumpImageFiles(options: {
    props: JumpImageInputProps;
    elements: ReturnType<typeof $getJumpImageElements>;
    state: JumpImageGalleryState;
    files: File[];
    renderGalleryState: () => void;
}) {
    if (options.files.length === 0) {
        return;
    }
    $setJumpImageProcessing(options.elements, options.state, true);
    try {
        const prepared = await $prepareJumpImageFiles(
            options.files,
            options.props,
        );
        const appended = prepared.appended;
        options.state.drafts = [...appended, ...options.state.drafts];
        options.state.selectedId = appended[0]?.id ?? options.state.selectedId;
        $setJumpImageUploadFile(
            options.elements,
            options.state,
            options.state.drafts.find(
                (item) => item.id === options.state.selectedId,
            )?.file,
        );
        options.elements.resizeNote.textContent = prepared.notes.join(" ");
        options.elements.resizeNote.classList.toggle(
            "hidden",
            prepared.notes.length === 0,
        );
        options.renderGalleryState();
    } catch (error) {
        console.error("Failed to process the selected jump images", error);
        options.elements.meta.textContent =
            "Could not process the selected images.";
        options.elements.meta.classList.remove("hidden");
    } finally {
        $setJumpImageProcessing(options.elements, options.state, false);
    }
}

function $createJumpImageGalleryController(
    props: JumpImageInputProps,
    elements: ReturnType<typeof $getJumpImageElements>,
) {
    const state: JumpImageGalleryState = {
        drafts: [],
        selectedId: null,
        processingCount: 0,
        previewUrls: new Map(),
    };

    function renderGalleryState() {
        $renderJumpImageGallery({
            gallery: elements.gallery,
            meta: elements.meta,
            clearAllButton: elements.clearAllButton,
            drafts: state.drafts,
            selectedId: state.selectedId,
            previewUrls: state.previewUrls,
            templateId: props.galleryItemTemplateId,
            jumpLinkTemplateId: props.jumpLinkTemplateId,
            jumpEditUrlTemplate: props.jumpEditUrlTemplate,
            selectDraft,
            deleteDraft: (id) =>
                void $deleteJumpImageDraft({
                    props,
                    elements,
                    state,
                    id,
                    renderGalleryState,
                }),
        });
    }

    function selectDraft(id: string) {
        const draft = state.drafts.find((item) => item.id === id);
        if (!draft) {
            return;
        }
        state.selectedId = id;
        $setJumpImageUploadFile(elements, state, draft.file);
        renderGalleryState();
        void $updateJumpImageDrafts({
            dbName: props.dbName,
            storeName: props.storeName,
            storageKey: props.storageKey,
            selectedId: state.selectedId,
        }).catch((error) => {
            console.error("Failed to save the selected jump image", error);
        });
    }

    function restoreDrafts() {
        void $loadJumpImageDrafts(
            props.dbName,
            props.storeName,
            props.storageKey,
        )
            .then((stored) => {
                state.drafts = stored.drafts;
                state.selectedId = state.drafts.some(
                    (item) => item.id === stored.selectedId,
                )
                    ? stored.selectedId
                    : (state.drafts[0]?.id ?? null);
                $setJumpImageUploadFile(
                    elements,
                    state,
                    state.drafts.find((item) => item.id === state.selectedId)
                        ?.file,
                );
                renderGalleryState();
            })
            .catch((error) => {
                console.error("Failed to restore the jump image drafts", error);
            });
    }

    return {
        appendFiles(files: File[]) {
            return $appendJumpImageFiles({
                props,
                elements,
                state,
                files,
                renderGalleryState,
            });
        },
        clearAllDrafts() {
            return $clearAllJumpImageDrafts({
                props,
                elements,
                state,
                renderGalleryState,
            });
        },
        isProcessing() {
            return state.processingCount > 0;
        },
        restoreDrafts,
        revokePreviewUrls() {
            for (const url of state.previewUrls.values()) {
                URL.revokeObjectURL(url);
            }
        },
    };
}

export function $initJumpImageInput(props: JumpImageInputProps) {
    const elements = $getJumpImageElements(props);
    const controller = $createJumpImageGalleryController(props, elements);

    elements.input.addEventListener("change", () => {
        const files = Array.from(elements.input.files ?? []);
        elements.input.value = "";
        void controller.appendFiles(files);
    });

    $setupCameraImageInput(
        elements.cameraInput,
        elements.cameraButton,
        controller.appendFiles,
    );
    $setupClipboardImageInput(elements.clipboardButton, controller.appendFiles);
    elements.clearAllButton.addEventListener("click", () => {
        void controller.clearAllDrafts();
    });

    elements.form.addEventListener("submit", (event) => {
        if (!controller.isProcessing()) {
            return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
    });

    controller.restoreDrafts();

    window.addEventListener("pagehide", () => {
        controller.revokePreviewUrls();
    });
}
