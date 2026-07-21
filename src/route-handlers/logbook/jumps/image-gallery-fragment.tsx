import clsx from "clsx";
import type { App, AppRequestContext } from "@/app/app";
import { JumpImage } from "@/route-handlers/logbook/jumps/image";
import * as routes from "@/routes";

const MAX_GALLERY_IMAGES = 100;

export function ImageGalleryFragment(props: {
    imageIds: string[];
    selectedId: string | null;
}) {
    if (props.imageIds.length === 0) {
        return null;
    }

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {props.imageIds.length} image
                    {props.imageIds.length === 1 ? "" : "s"}. Tap an image to
                    select it for AI recognition.
                </p>
                <button
                    type="button"
                    data-loki-clear-images
                    className="text-sm font-medium text-red-700 underline hover:no-underline dark:text-red-400"
                >
                    Clear all images
                </button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {props.imageIds.map((imageId) => (
                    <GalleryImage
                        imageId={imageId}
                        selected={imageId === props.selectedId}
                    />
                ))}
            </div>
        </>
    );
}

function GalleryImage(props: { imageId: string; selected: boolean }) {
    return (
        <div className="group relative min-w-0" data-loki-gallery-image>
            <button
                type="button"
                data-loki-select-image={props.imageId}
                aria-label="Select image"
                className={clsx(
                    "block w-full overflow-hidden rounded-lg border-2 p-1 text-left",
                    props.selected
                        ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200 dark:bg-indigo-950/30 dark:ring-indigo-900"
                        : "border-transparent bg-slate-100 hover:border-slate-300 dark:bg-slate-800 dark:hover:border-slate-600",
                )}
            >
                <JumpImage
                    imageId={props.imageId}
                    alt={
                        props.selected
                            ? "Selected jump image preview"
                            : "Jump image preview"
                    }
                    className="h-36 w-full rounded object-contain sm:h-44"
                />
                <span
                    data-loki-read-image
                    className="absolute left-2 top-2 hidden rounded-full bg-emerald-700 px-2 py-1 text-xs font-semibold text-white shadow"
                >
                    Read
                </span>
                <span
                    data-loki-image-meta
                    className="block h-5 truncate px-1 py-1 text-xs leading-none text-slate-600 dark:text-slate-300"
                />
            </button>
            <span
                data-loki-created-jumps
                className="hidden px-1 pb-2 text-xs text-indigo-700 dark:text-indigo-300"
            >
                Created: <span data-loki-created-jump-links />
            </span>
            <button
                type="button"
                data-loki-delete-image={props.imageId}
                aria-label="Delete image"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/75 text-sm font-bold text-white shadow hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
                X
            </button>
        </div>
    );
}

function getGalleryQuery(c: AppRequestContext) {
    const searchParams = new URL(c.req.url).searchParams;
    const imageIds = (searchParams.get("imageIds") ?? "")
        .split(",")
        .filter(Boolean)
        .slice(0, MAX_GALLERY_IMAGES);
    const selected = searchParams.get("selectedId");
    return {
        imageIds,
        selectedId: selected && imageIds.includes(selected) ? selected : null,
    };
}

export function register(app: App) {
    app.get(routes.logbook.jumps.imageGalleryFragment.route, (c) =>
        c.render(<ImageGalleryFragment {...getGalleryQuery(c)} />),
    );
}
