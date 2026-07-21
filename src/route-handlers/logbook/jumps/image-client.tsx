import { useId } from "hono/jsx";
import { useAppContext } from "@/app/app";
import { Script } from "@/components/script";
import { $assertElement, $idb, $renderTemplate, $select } from "@/utils";
import * as routes from "@/routes";
import {
    $appendJumpImageDrafts,
    $loadImage,
    $loadJumpImageDrafts,
    $updateJumpImageDrafts,
    JUMP_IMAGE_KEY,
    JUMP_IMAGE_STORE,
    jumpImageDbName,
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
    galleryId: string;
    galleryImageIdsInputId: string;
    resizeNoteId: string;
    jumpLinkTemplateId: string;
    jumpEditUrlTemplate: string;
    maxDimension: number;
    targetBytes: number;
    dbName: string;
    storeName: string;
    storageKey: string;
}

/**
 * Renders the HTMX gallery shell and starts the browser-side controller with
 * stable IDs for every element it owns.
 */
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
    const galleryId = useId();
    const galleryImageIdsInputId = useId();
    const resizeNoteId = useId();
    const jumpLinkTemplateId = useId();

    return (
        <>
            <input
                id={galleryImageIdsInputId}
                type="hidden"
                name="imageIds"
                data-loki-gallery-query
            />
            {/* jump-images-changed is dispatched by renderGalleryState(). */}
            <div
                id={galleryId}
                className="space-y-2"
                hx-get={routes.logbook.jumps.imageGalleryFragment({}, {})}
                hx-include="[data-loki-gallery-query]"
                hx-trigger="load, jump-images-changed"
                hx-swap="innerHTML focus-scroll:false"
            />
            <p
                id={resizeNoteId}
                className="hidden rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200"
            />
            <template id={jumpLinkTemplateId}>
                <a
                    data-loki-template-slot="label"
                    className="font-semibold underline hover:no-underline"
                />
            </template>
            <Script
                $deps={[
                    $assertElement,
                    $idb,
                    $select,
                    $renderTemplate,
                    $appendJumpImageDrafts,
                    $loadImage,
                    $loadJumpImageDrafts,
                    $updateJumpImageDrafts,
                    $formatJumpImageBytes,
                    $imageMimeTypeToExtension,
                    $JumpImageGalleryController,
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
                        galleryId,
                        galleryImageIdsInputId,
                        resizeNoteId,
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
                $exec={(props) => {
                    new $JumpImageGalleryController(props).init();
                }}
            />
        </>
    );
}

/** Formats file sizes consistently for resize notices and gallery metadata. */
export function $formatJumpImageBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Derives a useful file extension for images supplied as clipboard blobs. */
export function $imageMimeTypeToExtension(mimeType: string): string {
    const sub = mimeType.split("/")[1] ?? "";
    if (sub === "jpeg") {
        return "jpg";
    }
    return sub || "img";
}

/** Owns the gallery's DOM references, mutable state, and browser interactions. */
export class $JumpImageGalleryController {
    /** Configuration shared by storage operations and generated gallery links. */
    props: JumpImageInputProps;
    /** File picker used for selecting one or more ordinary image files. */
    input: HTMLInputElement;
    /** File input submitted with the form for the currently selected image. */
    uploadInput: HTMLInputElement;
    /** Hidden submitted ID that associates the selected draft with the jump. */
    imageIdInput: HTMLInputElement;
    /** Parent form whose submission must wait for image processing to finish. */
    form: HTMLFormElement;
    /** Capture-enabled file input opened by the dedicated camera button. */
    cameraInput: HTMLInputElement;
    /** Visible control that opens the otherwise hidden camera input. */
    cameraButton: HTMLButtonElement;
    /** Visible control that requests image data from the Clipboard API. */
    clipboardButton: HTMLButtonElement;
    /** HTMX target that renders and delegates interactions for gallery items. */
    gallery: HTMLElement;
    /** HTMX query input containing all draft IDs in display order. */
    galleryImageIdsInput: HTMLInputElement;
    /** Status element used for resize details and image-processing errors. */
    resizeNote: HTMLElement;
    /** Ordered IDs mirrored into the gallery fragment request. */
    imageIds: string[] = [];
    /** Draft currently copied into the form's submitted file input. */
    selectedId: string | null = null;
    /** Number of active batches, allowing overlapping work to block submit. */
    processingCount = 0;

    /** Resolves required elements once so operations cannot use mismatched refs. */
    constructor(props: JumpImageInputProps) {
        this.props = props;
        this.input = $select.id(props.inputId, HTMLInputElement);
        this.uploadInput = $select.id(props.uploadInputId, HTMLInputElement);
        this.imageIdInput = $select.id(props.imageIdInputId, HTMLInputElement);
        this.form = $select.id(props.formId, HTMLFormElement);
        this.cameraInput = $select.id(props.cameraInputId, HTMLInputElement);
        this.cameraButton = $select.id(props.cameraButtonId, HTMLButtonElement);
        this.clipboardButton = $select.id(
            props.clipboardButtonId,
            HTMLButtonElement,
        );
        this.gallery = $select.id(props.galleryId, HTMLElement);
        this.galleryImageIdsInput = $select.id(
            props.galleryImageIdsInputId,
            HTMLInputElement,
        );
        this.resizeNote = $select.id(props.resizeNoteId, HTMLElement);
    }

    /** Wires every gallery input and restores persisted drafts on page load. */
    init() {
        this.input.addEventListener("change", () => {
            const files = Array.from(this.input.files ?? []);
            this.input.value = "";
            void this.appendFiles(files);
        });
        this.setupCameraImageInput();
        this.setupClipboardImageInput();
        this.gallery.addEventListener("click", (event) => {
            this.handleGalleryClick(event);
        });
        // Emitted by $loadJumpImageElement in image.tsx after each draft loads.
        this.gallery.addEventListener("loki:jump-image-loaded", (event) => {
            this.enrichJumpImageGalleryItem(event);
        });
        this.form.addEventListener("submit", (event) => {
            if (this.processingCount > 0) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        });
        this.restoreDrafts();
    }

    /**
     * Sends images from explicit clipboard reads and page-level paste events to
     * the gallery while preserving normal paste behavior inside form controls.
     */
    setupClipboardImageInput() {
        function makeClipboardImage(blob: Blob, mimeType: string) {
            const ext = $imageMimeTypeToExtension(mimeType);
            return new File([blob], `pasted-image.${ext}`, {
                type: mimeType,
                lastModified: Date.now(),
            });
        }

        this.clipboardButton.addEventListener("click", async () => {
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
                void this.appendFiles(files);
            } catch (error) {
                console.error(
                    "Failed to read an image from the clipboard",
                    error,
                );
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
                void this.appendFiles(files);
            }
        });
    }

    /** Connects the camera trigger and its hidden file input to gallery ingestion. */
    setupCameraImageInput() {
        this.cameraInput.addEventListener("change", () => {
            const files = Array.from(this.cameraInput.files ?? []);
            this.cameraInput.value = "";
            void this.appendFiles(files);
        });
        this.cameraButton.addEventListener("click", () =>
            this.cameraInput.click(),
        );
    }

    /**
     * Adds IndexedDB-only draft metadata to an item after loki:jump-image-loaded
     * (from image.tsx); the server-rendered fragment cannot access that data.
     * Selection chrome is applied here too, not via SSR.
     */
    enrichJumpImageGalleryItem(event: Event) {
        if (!(event instanceof CustomEvent)) {
            return;
        }
        const image = event.target;
        $assertElement(image, HTMLImageElement);
        const item = image.closest("[data-loki-gallery-image]");
        $assertElement(item, HTMLElement);
        const draft = event.detail;
        const selectButton = $select.el(
            "[data-loki-select-image]",
            HTMLButtonElement,
            item,
        );
        const deleteButton = $select.el(
            "[data-loki-delete-image]",
            HTMLButtonElement,
            item,
        );
        const meta = $select.el("[data-loki-image-meta]", HTMLElement, item);
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
        selectButton.setAttribute("aria-label", `Select ${draft.file.name}`);
        deleteButton.setAttribute("aria-label", `Delete ${draft.file.name}`);
        this.applySelectionToItem(
            item,
            draft.id === this.selectedId,
            draft.file.name,
        );
        meta.textContent = `${draft.file.name} · ${$formatJumpImageBytes(draft.file.size)}`;
        readIndicator.classList.toggle("hidden", !draft.read);
        for (const [index, jump] of draft.createdJumps.entries()) {
            const linkContainer = document.createElement("span");
            $renderTemplate(linkContainer, this.props.jumpLinkTemplateId, {
                label: `Jump #${jump.jumpNumber}`,
            });
            const link = $select.el(
                ":scope > *",
                HTMLAnchorElement,
                linkContainer,
            );
            link.href = this.props.jumpEditUrlTemplate.replace(
                "__JUMP_UUID__",
                encodeURIComponent(jump.uuid),
            );
            if (index > 0) {
                createdJumpLinks.appendChild(document.createTextNode(", "));
            }
            createdJumpLinks.appendChild(link);
        }
        createdJumps.classList.toggle(
            "invisible",
            draft.createdJumps.length === 0,
        );
    }

    /** Selected border classes (method body is serialized into the browser). */
    selectedClasses() {
        return [
            "border-indigo-500",
            "bg-indigo-50",
            "ring-2",
            "ring-indigo-200",
            "dark:bg-indigo-950/30",
            "dark:ring-indigo-900",
        ];
    }

    /** Default border classes (method body is serialized into the browser). */
    unselectedClasses() {
        return [
            "border-transparent",
            "bg-slate-100",
            "hover:border-slate-300",
            "dark:bg-slate-800",
            "dark:hover:border-slate-600",
        ];
    }

    /** Toggles selected border/alt chrome for one gallery item. */
    applySelectionToItem(
        item: HTMLElement,
        selected: boolean,
        fileName?: string,
    ) {
        const selectButton = $select.el(
            "[data-loki-select-image]",
            HTMLButtonElement,
            item,
        );
        const image = $select.el("img", HTMLImageElement, item);
        const selectedClasses = this.selectedClasses();
        const unselectedClasses = this.unselectedClasses();
        selectButton.classList.remove(
            ...(selected ? unselectedClasses : selectedClasses),
        );
        selectButton.classList.add(
            ...(selected ? selectedClasses : unselectedClasses),
        );
        if (selected) {
            image.alt = "Selected jump image preview";
            return;
        }
        const name =
            fileName ??
            selectButton
                .getAttribute("aria-label")
                ?.replace(/^Select\s+/, "")
                .trim();
        image.alt = name ? `Jump image preview: ${name}` : "Jump image preview";
    }

    /** Re-applies selection chrome across items already in the gallery DOM. */
    applySelectionStyles() {
        for (const item of $select.all(
            "[data-loki-gallery-image]",
            HTMLElement,
            this.gallery,
        )) {
            const selectButton = $select.el(
                "[data-loki-select-image]",
                HTMLButtonElement,
                item,
            );
            const id = selectButton.dataset.lokiSelectImage ?? "";
            this.applySelectionToItem(item, id === this.selectedId);
        }
    }

    /** Routes delegated item actions because HTMX replaces gallery children. */
    handleGalleryClick(event: Event) {
        const target = event.target;
        $assertElement(target, Element);
        const selectButton = target.closest("[data-loki-select-image]");
        if (selectButton) {
            $assertElement(selectButton, HTMLButtonElement);
            void this.selectDraft(selectButton.dataset.lokiSelectImage ?? "");
            return;
        }
        const deleteButton = target.closest("[data-loki-delete-image]");
        if (deleteButton) {
            $assertElement(deleteButton, HTMLButtonElement);
            void this.deleteDraft(deleteButton.dataset.lokiDeleteImage ?? "");
            return;
        }
        if (target.closest("[data-loki-clear-images]")) {
            void this.clearAllDrafts();
        }
    }

    /**
     * Mirrors draft IDs into the HTMX query input and requests a fresh
     * server-rendered shell. Selection chrome is applied client-side after each
     * image loads (loki:jump-image-loaded), not by the fragment.
     * Dispatches jump-images-changed; the gallery div listens via hx-trigger.
     */
    renderGalleryState() {
        // Blur before swap so Android does not scroll when the focused control
        // is removed with the old gallery fragment.
        const active = document.activeElement;
        if (active instanceof HTMLElement && this.gallery.contains(active)) {
            active.blur();
        }
        this.galleryImageIdsInput.value = this.imageIds.join(",");
        this.gallery.dispatchEvent(
            new CustomEvent("jump-images-changed", { bubbles: true }),
        );
    }

    /**
     * Copies the selected draft into the form file input; DataTransfer is
     * required because a FileList cannot be constructed or assigned directly.
     */
    setUploadFile(file: File | undefined) {
        const transfer = new DataTransfer();
        if (file) {
            transfer.items.add(file);
        }
        this.uploadInput.files = transfer.files;
        this.imageIdInput.value = file ? (this.selectedId ?? "") : "";
    }

    /** Tracks active image work and prevents submission of an incomplete batch. */
    setProcessing(value: boolean) {
        const submit = $select.el(
            'button[type="submit"]',
            HTMLButtonElement,
            this.form,
        );
        this.processingCount += value ? 1 : -1;
        submit.disabled = this.processingCount > 0;
        if (this.processingCount > 0) {
            this.form.setAttribute("aria-busy", "true");
        } else {
            this.form.removeAttribute("aria-busy");
        }
    }

    /**
     * Reduces image dimensions and JPEG/WebP quality before IndexedDB storage so
     * large camera images do not make the draft gallery unnecessarily expensive.
     */
    async resizeJumpImageIfNeeded(file: File): Promise<{
        file: File;
        originalWidth: number;
        originalHeight: number;
        width: number;
        height: number;
        resized: boolean;
    }> {
        const maxDimension = this.props.maxDimension;
        const targetBytes = this.props.targetBytes;
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
        const needsResize =
            longestSide > maxDimension || file.size > targetBytes;
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

    /**
     * Resizes a batch, stores it as drafts, and returns user-facing notes together
     * with the persisted records needed to update gallery state.
     */
    async prepareJumpImageFiles(files: File[]) {
        const results = await Promise.all(
            files.map((file) =>
                this.resizeJumpImageIfNeeded(file).then((result) => ({
                    original: file,
                    result,
                })),
            ),
        );
        const appended = await $appendJumpImageDrafts(
            {
                files: results.map((item) => item.result.file),
                dbName: this.props.dbName,
                storeName: this.props.storeName,
                storageKey: this.props.storageKey,
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

    /** Prepares new files, prepends their drafts, and selects the newest image. */
    async appendFiles(files: File[]) {
        if (files.length === 0) {
            return;
        }
        this.setProcessing(true);
        try {
            const prepared = await this.prepareJumpImageFiles(files);
            const appended = prepared.appended;
            this.imageIds = [
                ...appended.map((draft) => draft.id),
                ...this.imageIds,
            ];
            this.selectedId = appended[0]?.id ?? this.selectedId;
            this.setUploadFile(
                appended.find((item) => item.id === this.selectedId)?.file,
            );
            this.resizeNote.textContent = prepared.notes.join(" ");
            this.resizeNote.classList.toggle(
                "hidden",
                prepared.notes.length === 0,
            );
            this.renderGalleryState();
        } catch (error) {
            console.error("Failed to process the selected jump images", error);
            this.resizeNote.textContent =
                "Could not process the selected images.";
            this.resizeNote.classList.remove("hidden");
        } finally {
            this.setProcessing(false);
        }
    }

    /** Selects a stored draft for submission and persists that choice. */
    async selectDraft(id: string) {
        const draft = await $loadImage(id, this.props.dbName);
        if (!draft) {
            return;
        }
        this.selectedId = id;
        this.setUploadFile(draft.file);
        this.applySelectionStyles();
        void $updateJumpImageDrafts({
            dbName: this.props.dbName,
            storeName: this.props.storeName,
            storageKey: this.props.storageKey,
            selectedId: this.selectedId,
        }).catch((error) => {
            console.error("Failed to save the selected jump image", error);
        });
    }

    /** Deletes one draft and falls back to the first remaining image if needed. */
    async deleteDraft(id: string) {
        const remaining = this.imageIds.filter((imageId) => imageId !== id);
        const nextSelectedId =
            this.selectedId === id ? (remaining[0] ?? null) : this.selectedId;
        try {
            await $updateJumpImageDrafts({
                dbName: this.props.dbName,
                storeName: this.props.storeName,
                storageKey: this.props.storageKey,
                selectedId: nextSelectedId,
                deletedId: id,
            });
            this.imageIds = remaining;
            this.selectedId = nextSelectedId;
            const selected = nextSelectedId
                ? await $loadImage(nextSelectedId, this.props.dbName)
                : null;
            this.setUploadFile(selected?.file);
            this.renderGalleryState();
        } catch (error) {
            console.error("Failed to delete the jump image", error);
        }
    }

    /** Clears persisted and local gallery state even if storage cleanup fails. */
    async clearAllDrafts() {
        try {
            await $updateJumpImageDrafts({
                dbName: this.props.dbName,
                storeName: this.props.storeName,
                storageKey: this.props.storageKey,
                selectedId: null,
                clearAll: true,
            });
        } catch (error) {
            console.error("Failed to clear jump images", error);
        } finally {
            this.imageIds = [];
            this.selectedId = null;
            this.setUploadFile(undefined);
            this.resizeNote.textContent = "";
            this.resizeNote.classList.add("hidden");
            this.renderGalleryState();
        }
    }

    /** Restores draft order and a valid selection from browser storage. */
    restoreDrafts() {
        void $loadJumpImageDrafts(
            this.props.dbName,
            this.props.storeName,
            this.props.storageKey,
        )
            .then((stored) => {
                this.imageIds = stored.drafts.map((draft) => draft.id);
                this.selectedId = this.imageIds.some(
                    (id) => id === stored.selectedId,
                )
                    ? stored.selectedId
                    : (this.imageIds[0] ?? null);
                this.setUploadFile(
                    stored.drafts.find((item) => item.id === this.selectedId)
                        ?.file,
                );
                this.renderGalleryState();
            })
            .catch((error) => {
                console.error("Failed to restore the jump image drafts", error);
            });
    }
}
