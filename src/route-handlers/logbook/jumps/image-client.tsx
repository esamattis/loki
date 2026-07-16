import { useId } from "hono/jsx";
import { Script } from "@/components/script";
import { $assertElement, $renderTemplate } from "@/utils";
import {
    $appendJumpImageDrafts,
    $loadJumpImageDrafts,
    $updateJumpImageDrafts,
    type JumpImageDraft,
} from "@/route-handlers/logbook/jumps/image-storage-client";

export const JUMP_IMAGE_MAX_DIMENSION = 2048;
export const JUMP_IMAGE_TARGET_BYTES = 2 * 1024 * 1024;
export const JUMP_IMAGE_DB_NAME = "loki-jump-from-image";
export const JUMP_IMAGE_STORE = "images";
export const JUMP_IMAGE_KEY = "draft";

interface JumpImageInputProps {
    inputId: string;
    uploadInputId: string;
    formId: string;
    cameraInputId: string;
    cameraButtonId: string;
    clipboardButtonId: string;
    galleryId: string;
    metaId: string;
    resizeNoteId: string;
    galleryItemTemplateId: string;
    maxDimension: number;
    targetBytes: number;
    dbName: string;
    storeName: string;
    storageKey: string;
}

export function ImageGallery(props: {
    inputId: string;
    uploadInputId: string;
    formId: string;
    cameraInputId: string;
    cameraButtonId: string;
    clipboardButtonId: string;
}) {
    const galleryId = useId();
    const metaId = useId();
    const resizeNoteId = useId();
    const galleryItemTemplateId = useId();

    return (
        <>
            <div
                id={galleryId}
                className="hidden grid grid-cols-2 gap-3 md:grid-cols-3"
            />
            <p
                id={metaId}
                className="hidden text-sm text-slate-500 dark:text-slate-400"
            />
            <p
                id={resizeNoteId}
                className="hidden rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200"
            />
            <template id={galleryItemTemplateId}>
                <div className="group relative min-w-0">
                    <button type="button" data-select-image>
                        <img className="h-36 w-full rounded object-contain sm:h-44" />
                        <span
                            data-template-slot="meta"
                            className="block truncate px-1 py-1 text-xs text-slate-600 dark:text-slate-300"
                        ></span>
                    </button>
                    <button
                        type="button"
                        data-delete-image
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/75 text-sm font-bold text-white shadow hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                    >
                        X
                    </button>
                </div>
            </template>
            <Script
                $deps={[
                    $assertElement,
                    $renderTemplate,
                    $appendJumpImageDrafts,
                    $loadJumpImageDrafts,
                    $updateJumpImageDrafts,
                    $resizeJumpImageIfNeeded,
                    $formatJumpImageBytes,
                    $getJumpImageElements,
                    $renderJumpImageGallery,
                    $prepareJumpImageFiles,
                    $setupClipboardImageInput,
                    $imageMimeTypeToExtension,
                ]}
                $args={[
                    {
                        inputId: props.inputId,
                        uploadInputId: props.uploadInputId,
                        formId: props.formId,
                        cameraInputId: props.cameraInputId,
                        cameraButtonId: props.cameraButtonId,
                        clipboardButtonId: props.clipboardButtonId,
                        galleryId,
                        metaId,
                        resizeNoteId,
                        galleryItemTemplateId,
                        maxDimension: JUMP_IMAGE_MAX_DIMENSION,
                        targetBytes: JUMP_IMAGE_TARGET_BYTES,
                        dbName: JUMP_IMAGE_DB_NAME,
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

export function $getJumpImageElements(props: JumpImageInputProps) {
    const inputEl = document.getElementById(props.inputId);
    const uploadInputEl = document.getElementById(props.uploadInputId);
    const formEl = document.getElementById(props.formId);
    const cameraInputEl = document.getElementById(props.cameraInputId);
    const cameraButtonEl = document.getElementById(props.cameraButtonId);
    const clipboardButtonEl = document.getElementById(props.clipboardButtonId);
    const galleryEl = document.getElementById(props.galleryId);
    const metaEl = document.getElementById(props.metaId);
    const resizeNoteEl = document.getElementById(props.resizeNoteId);
    $assertElement(inputEl, HTMLInputElement);
    $assertElement(uploadInputEl, HTMLInputElement);
    $assertElement(formEl, HTMLFormElement);
    $assertElement(cameraInputEl, HTMLInputElement);
    $assertElement(cameraButtonEl, HTMLButtonElement);
    $assertElement(clipboardButtonEl, HTMLButtonElement);
    $assertElement(galleryEl, HTMLElement);
    $assertElement(metaEl, HTMLElement);
    $assertElement(resizeNoteEl, HTMLElement);
    return {
        input: inputEl,
        uploadInput: uploadInputEl,
        form: formEl,
        cameraInput: cameraInputEl,
        cameraButton: cameraButtonEl,
        clipboardButton: clipboardButtonEl,
        gallery: galleryEl,
        meta: metaEl,
        resizeNote: resizeNoteEl,
    };
}

export function $renderJumpImageGallery(options: {
    gallery: HTMLElement;
    meta: HTMLElement;
    drafts: JumpImageDraft[];
    selectedId: string | null;
    previewUrls: Map<string, string>;
    templateId: string;
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
        const item = container.firstElementChild;
        $assertElement(item, HTMLElement);
        const selectButton = item.querySelector("[data-select-image]");
        const image = item.querySelector("img");
        const deleteButton = item.querySelector("[data-delete-image]");
        $assertElement(selectButton, HTMLButtonElement);
        $assertElement(image, HTMLImageElement);
        $assertElement(deleteButton, HTMLButtonElement);
        selectButton.className = selectClass;
        selectButton.dataset.selectImage = draft.id;
        selectButton.setAttribute("aria-label", `Select ${draft.file.name}`);
        image.src = url;
        image.alt = alt;
        deleteButton.dataset.deleteImage = draft.id;
        deleteButton.setAttribute("aria-label", `Delete ${draft.file.name}`);
        options.gallery.appendChild(item);
    }
    for (const button of options.gallery.querySelectorAll(
        "[data-select-image]",
    )) {
        $assertElement(button, HTMLButtonElement);
        button.addEventListener("click", () => {
            options.selectDraft(button.dataset.selectImage ?? "");
        });
    }
    for (const button of options.gallery.querySelectorAll(
        "[data-delete-image]",
    )) {
        $assertElement(button, HTMLButtonElement);
        button.addEventListener("click", () => {
            options.deleteDraft(button.dataset.deleteImage ?? "");
        });
    }
    options.gallery.classList.toggle("hidden", options.drafts.length === 0);
    options.meta.textContent =
        options.drafts.length === 0
            ? ""
            : `${options.drafts.length} image${options.drafts.length === 1 ? "" : "s"}. Tap an image to select it for AI recognition.`;
    options.meta.classList.toggle("hidden", options.drafts.length === 0);
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
    const appended = await $appendJumpImageDrafts({
        files: results.map((item) => item.result.file),
        dbName: props.dbName,
        storeName: props.storeName,
        storageKey: props.storageKey,
    });
    const notes = results
        .filter((item) => item.result.resized)
        .map(
            (item) =>
                `Resized from ${$formatJumpImageBytes(item.original.size)} (${item.result.originalWidth} x ${item.result.originalHeight}) to ${$formatJumpImageBytes(item.result.file.size)} (${item.result.width} x ${item.result.height}).`,
        );
    return { appended, notes };
}

export function $initJumpImageInput(props: JumpImageInputProps) {
    const elements = $getJumpImageElements(props);
    const input = elements.input;
    const uploadInput = elements.uploadInput;
    const form = elements.form;
    const cameraInput = elements.cameraInput;
    const cameraButton = elements.cameraButton;
    const clipboardButton = elements.clipboardButton;
    const gallery = elements.gallery;
    const meta = elements.meta;
    const resizeNote = elements.resizeNote;

    let drafts: JumpImageDraft[] = [];
    let selectedId: string | null = null;
    let processingCount = 0;
    const previewUrls = new Map<string, string>();

    function setProcessing(value: boolean) {
        const submit = form.querySelector('button[type="submit"]');
        $assertElement(submit, HTMLButtonElement);
        processingCount += value ? 1 : -1;
        submit.disabled = processingCount > 0;
        if (processingCount > 0) {
            form.setAttribute("aria-busy", "true");
        } else {
            form.removeAttribute("aria-busy");
        }
    }

    function setUploadFile(file: File | undefined) {
        const transfer = new DataTransfer();
        if (file) {
            transfer.items.add(file);
        }
        uploadInput.files = transfer.files;
    }

    function selectDraft(id: string) {
        const draft = drafts.find((item) => item.id === id);
        if (!draft) {
            return;
        }
        selectedId = id;
        setUploadFile(draft.file);
        renderGalleryState();
        void $updateJumpImageDrafts({
            dbName: props.dbName,
            storeName: props.storeName,
            storageKey: props.storageKey,
            selectedId,
        }).catch((error) => {
            console.error("Failed to save the selected jump image", error);
        });
    }

    async function deleteDraft(id: string) {
        const remaining = drafts.filter((item) => item.id !== id);
        const nextSelectedId =
            selectedId === id ? (remaining[0]?.id ?? null) : selectedId;
        try {
            await $updateJumpImageDrafts({
                dbName: props.dbName,
                storeName: props.storeName,
                storageKey: props.storageKey,
                selectedId: nextSelectedId,
                deletedId: id,
            });
            drafts = remaining;
            selectedId = nextSelectedId;
            setUploadFile(drafts.find((item) => item.id === selectedId)?.file);
            const url = previewUrls.get(id);
            if (url) {
                URL.revokeObjectURL(url);
                previewUrls.delete(id);
            }
            renderGalleryState();
        } catch (error) {
            console.error("Failed to delete the jump image", error);
        }
    }

    function renderGalleryState() {
        $renderJumpImageGallery({
            gallery,
            meta,
            drafts,
            selectedId,
            previewUrls,
            templateId: props.galleryItemTemplateId,
            selectDraft,
            deleteDraft: (id) => void deleteDraft(id),
        });
    }

    async function appendFiles(files: File[]) {
        if (files.length === 0) {
            return;
        }
        setProcessing(true);
        try {
            const prepared = await $prepareJumpImageFiles(files, props);
            const appended = prepared.appended;
            drafts.push(...appended);
            selectedId = appended[0]?.id ?? selectedId;
            setUploadFile(drafts.find((item) => item.id === selectedId)?.file);
            resizeNote.textContent = prepared.notes.join(" ");
            resizeNote.classList.toggle("hidden", prepared.notes.length === 0);
            renderGalleryState();
        } catch (error) {
            console.error("Failed to process the selected jump images", error);
            meta.textContent = "Could not process the selected images.";
            meta.classList.remove("hidden");
        } finally {
            setProcessing(false);
        }
    }

    input.addEventListener("change", () => {
        const files = Array.from(input.files ?? []);
        input.value = "";
        void appendFiles(files);
    });

    cameraInput.addEventListener("change", () => {
        const files = Array.from(cameraInput.files ?? []);
        cameraInput.value = "";
        void appendFiles(files);
    });

    cameraButton.addEventListener("click", () => {
        cameraInput.click();
    });

    $setupClipboardImageInput(clipboardButton, (files) => {
        void appendFiles(files);
    });

    form.addEventListener("submit", (event) => {
        if (processingCount === 0) {
            return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
    });

    void $loadJumpImageDrafts(props.dbName, props.storeName, props.storageKey)
        .then((stored) => {
            drafts = stored.drafts;
            selectedId = drafts.some((item) => item.id === stored.selectedId)
                ? stored.selectedId
                : (drafts[0]?.id ?? null);
            setUploadFile(drafts.find((item) => item.id === selectedId)?.file);
            renderGalleryState();
        })
        .catch((error) => {
            console.error("Failed to restore the jump image drafts", error);
        });

    window.addEventListener("pagehide", () => {
        for (const url of previewUrls.values()) {
            URL.revokeObjectURL(url);
        }
    });
}
