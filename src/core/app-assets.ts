import htmx from "htmx.org/dist/htmx.esm.js?raw";
import tailwind from "@/tailwind.css?inline";

async function fingerprint(content: string) {
    const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(content),
    );
    return Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0"),
    ).join("");
}

const [tailwindFingerprint, htmxFingerprint] = await Promise.all([
    fingerprint(tailwind),
    fingerprint(htmx),
]);

export const tailwindAsset = {
    content: tailwind,
    fingerprint: tailwindFingerprint,
};

export const htmxAsset = {
    content: htmx,
    fingerprint: htmxFingerprint,
};
