import { expect, test } from "./fixtures";

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const INVALID_FINGERPRINT = "z".repeat(64);

test("generated assets use content-fingerprinted immutable URLs", async ({
    request,
}) => {
    const pageResponse = await request.get("/login");
    expect(pageResponse.status()).toBe(200);

    const html = await pageResponse.text();
    const tailwindUrl = html.match(
        /href="(\/assets\/[a-f0-9]{64}\/tailwind\.css)"/,
    )?.[1];
    const htmxUrl = html.match(
        /src="(\/assets\/[a-f0-9]{64}\/htmx\.esm\.js)"/,
    )?.[1];

    expect(tailwindUrl).toBeDefined();
    expect(htmxUrl).toBeDefined();
    if (!tailwindUrl || !htmxUrl) {
        return;
    }

    for (const [url, contentType] of [
        [tailwindUrl, "text/css; charset=utf-8"],
        [htmxUrl, "text/javascript; charset=utf-8"],
    ] as const) {
        const response = await request.get(url);
        expect(response.status()).toBe(200);
        expect(response.headers()["cache-control"]).toBe(
            IMMUTABLE_CACHE_CONTROL,
        );
        expect(response.headers()["content-type"]).toBe(contentType);
        expect((await response.body()).byteLength).toBeGreaterThan(0);

        const invalidUrl = url.replace(/[a-f0-9]{64}/, INVALID_FINGERPRINT);
        const invalidResponse = await request.get(invalidUrl);
        expect(invalidResponse.status()).toBe(404);
        expect(invalidResponse.headers()["cache-control"]).not.toBe(
            IMMUTABLE_CACHE_CONTROL,
        );
    }

    for (const oldUrl of ["/assets/tailwind.css", "/assets/htmx.esm.js"]) {
        const response = await request.get(oldUrl);
        expect(response.status()).toBe(404);
    }
});
