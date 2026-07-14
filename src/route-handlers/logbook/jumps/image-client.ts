import { $assertElement } from "@/utils";

export const JUMP_IMAGE_MAX_DIMENSION = 2048;
export const JUMP_IMAGE_TARGET_BYTES = 2 * 1024 * 1024;
export const JUMP_IMAGE_DB_NAME = "hypyt-jump-from-image";
export const JUMP_IMAGE_STORE = "images";
export const JUMP_IMAGE_KEY = "draft";

export function $saveJumpImageDraft(
    file: File,
    dbName: string,
    storeName: string,
    storageKey: string,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName);
            }
        };
        request.onerror = () =>
            reject(request.error ?? new Error("Failed to open IndexedDB"));
        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(storeName, "readwrite");
            tx.objectStore(storeName).put(
                {
                    blob: file,
                    name: file.name,
                    type: file.type,
                    lastModified: file.lastModified,
                },
                storageKey,
            );
            tx.oncomplete = () => {
                db.close();
                resolve();
            };
            tx.onerror = () => {
                db.close();
                reject(tx.error ?? new Error("Failed to save image draft"));
            };
        };
    });
}

export function $loadJumpImageDraft(
    dbName: string,
    storeName: string,
    storageKey: string,
): Promise<File | null> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName);
            }
        };
        request.onerror = () =>
            reject(request.error ?? new Error("Failed to open IndexedDB"));
        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(storeName, "readonly");
            const getRequest = tx.objectStore(storeName).get(storageKey);
            getRequest.onsuccess = () => {
                db.close();
                const record = getRequest.result;
                if (
                    record == null ||
                    typeof record !== "object" ||
                    !(record.blob instanceof Blob)
                ) {
                    resolve(null);
                    return;
                }
                const name =
                    typeof record.name === "string"
                        ? record.name
                        : "jump-image.jpg";
                const type =
                    typeof record.type === "string"
                        ? record.type
                        : record.blob.type || "image/jpeg";
                const lastModified =
                    typeof record.lastModified === "number"
                        ? record.lastModified
                        : Date.now();
                resolve(
                    new File([record.blob], name || "jump-image.jpg", {
                        type: type || "image/jpeg",
                        lastModified,
                    }),
                );
            };
            getRequest.onerror = () => {
                db.close();
                reject(
                    getRequest.error ?? new Error("Failed to load image draft"),
                );
            };
        };
    });
}

export async function $resizeJumpImageIfNeeded(
    file: File,
    maxDimension: number,
    targetBytes: number,
): Promise<File> {
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
        return file;
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
        return file;
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
    return new File([blob], `${baseName}.${extension}`, {
        type: outputType,
        lastModified: Date.now(),
    });
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
    handleSelectedFile: (file: File | undefined) => void,
) {
    function applyClipboardImage(blob: Blob, mimeType: string) {
        const ext = $imageMimeTypeToExtension(mimeType);
        const file = new File([blob], `pasted-image.${ext}`, {
            type: mimeType,
            lastModified: Date.now(),
        });
        handleSelectedFile(file);
    }

    clipboardButton.addEventListener("click", async () => {
        try {
            if (typeof navigator.clipboard?.read !== "function") {
                return;
            }
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                const imageType = item.types.find((t) =>
                    t.startsWith("image/"),
                );
                if (imageType) {
                    const blob = await item.getType(imageType);
                    applyClipboardImage(blob, imageType);
                    return;
                }
            }
        } catch {
            // Clipboard read is not supported or no image available; ignore.
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
        for (const item of data.items) {
            if (item.kind === "file" && item.type.startsWith("image/")) {
                const file = item.getAsFile();
                if (file) {
                    event.preventDefault();
                    applyClipboardImage(file, file.type || "image/png");
                    return;
                }
            }
        }
    });
}

export function $initJumpImageInput(props: {
    inputId: string;
    cameraInputId: string;
    cameraButtonId: string;
    clipboardButtonId: string;
    previewId: string;
    metaId: string;
    maxDimension: number;
    targetBytes: number;
    dbName: string;
    storeName: string;
    storageKey: string;
}) {
    const inputEl = document.getElementById(props.inputId);
    const cameraInputEl = document.getElementById(props.cameraInputId);
    const cameraButtonEl = document.getElementById(props.cameraButtonId);
    const clipboardButtonEl = document.getElementById(props.clipboardButtonId);
    const previewEl = document.getElementById(props.previewId);
    const metaEl = document.getElementById(props.metaId);
    $assertElement(inputEl, HTMLInputElement);
    $assertElement(cameraInputEl, HTMLInputElement);
    $assertElement(cameraButtonEl, HTMLButtonElement);
    $assertElement(clipboardButtonEl, HTMLButtonElement);
    $assertElement(previewEl, HTMLImageElement);
    $assertElement(metaEl, HTMLElement);
    const input: HTMLInputElement = inputEl;
    const cameraInput: HTMLInputElement = cameraInputEl;
    const cameraButton: HTMLButtonElement = cameraButtonEl;
    const clipboardButton: HTMLButtonElement = clipboardButtonEl;
    const preview: HTMLImageElement = previewEl;
    const meta: HTMLElement = metaEl;

    let previewUrl: string | null = null;

    function setInputFile(file: File) {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
    }

    function showPreview(file: File) {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        previewUrl = URL.createObjectURL(file);
        preview.src = previewUrl;
        preview.classList.remove("hidden");
        meta.textContent = `${file.name} · ${$formatJumpImageBytes(file.size)}`;
        meta.classList.remove("hidden");
    }

    async function applyFile(file: File) {
        const processed = await $resizeJumpImageIfNeeded(
            file,
            props.maxDimension,
            props.targetBytes,
        );
        setInputFile(processed);
        showPreview(processed);
        try {
            await $saveJumpImageDraft(
                processed,
                props.dbName,
                props.storeName,
                props.storageKey,
            );
        } catch {
            // Storage is best-effort; form still works without restore.
        }
    }

    function handleSelectedFile(file: File | undefined) {
        if (!file) {
            return;
        }
        void applyFile(file).catch(() => {
            meta.textContent = "Could not process the selected image.";
            meta.classList.remove("hidden");
        });
    }

    input.addEventListener("change", () => {
        handleSelectedFile(input.files?.[0]);
    });

    cameraInput.addEventListener("change", () => {
        handleSelectedFile(cameraInput.files?.[0]);
        cameraInput.value = "";
    });

    cameraButton.addEventListener("click", () => {
        cameraInput.click();
    });

    $setupClipboardImageInput(clipboardButton, handleSelectedFile);

    void $loadJumpImageDraft(props.dbName, props.storeName, props.storageKey)
        .then((file) => {
            if (!file || input.files?.length) {
                return;
            }
            setInputFile(file);
            showPreview(file);
        })
        .catch(() => {
            // Ignore restore failures.
        });
}
