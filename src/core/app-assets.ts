import htmx from "htmx.org/dist/htmx.esm.js?raw";
import tailwind from "@/core/tailwind.css?inline";

/** Adds a content fingerprint to an asset path. */
async function fingerprint(content: string) {
    const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(content),
    );
    return Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0"),
    ).join("");
}

/** Stores the tailwind fingerprint, htmx fingerprint used by this module. */
const [tailwindFingerprint, htmxFingerprint] = await Promise.all([
    fingerprint(tailwind),
    fingerprint(htmx),
]);

/** Stores the tailwind asset used by this module. */
export const tailwindAsset = {
    content: tailwind,
    fingerprint: tailwindFingerprint,
};

/** Stores the htmx asset used by this module. */
export const htmxAsset = {
    content: htmx,
    fingerprint: htmxFingerprint,
};
