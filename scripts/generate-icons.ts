/**
 * Generates favicon and app icon assets from public/logo.svg.
 *
 * Pipeline:
 * 1. Rasterize SVG with librsvg (`rsvg-convert`) for correct fill colors
 * 2. Resize / pad with GraphicsMagick (`gm`)
 *
 * Requires on PATH: `gm` and `rsvg-convert`.
 * Logo fill should match app brand indigo (#4f46e5).
 *
 * Usage: node scripts/generate-icons.ts
 */
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const LOGO_SVG = join(PUBLIC, "logo.svg");

/** Tailwind indigo-600 / app theme-color */
const BRAND = "#4f46e5";
/** Tailwind slate-950 / app dark-mode background */
const BACKGROUND = "#020617";

const PNG_TARGETS: { file: string; size: number; paddingRatio: number }[] = [
    { file: "icon.png", size: 192, paddingRatio: 0.12 },
    { file: "icon-192.png", size: 192, paddingRatio: 0.12 },
    { file: "icon-512.png", size: 512, paddingRatio: 0.12 },
    { file: "apple-72x72.png", size: 72, paddingRatio: 0.12 },
    { file: "apple-144x144.png", size: 144, paddingRatio: 0.12 },
];

const FAVICON_SIZES = [16, 32] as const;

async function requireCommand(command: string, installHint: string) {
    try {
        await execFile(command, command === "gm" ? ["version"] : ["--version"]);
    } catch {
        throw new Error(`${installHint} (\`${command}\` not found on PATH)`);
    }
}

async function gmConvert(args: string[]) {
    await execFile("gm", ["convert", ...args]);
}

/**
 * Rasterize the SVG tall enough that padding still leaves a sharp logo.
 */
async function rasterizeLogo(outPng: string, height: number) {
    await execFile("rsvg-convert", [
        "-h",
        String(height),
        LOGO_SVG,
        "-o",
        outPng,
    ]);
}

/**
 * Square PNG with a centered logo and optional transparent background.
 */
async function writeSquarePng(config: {
    sourcePng: string;
    outPath: string;
    size: number;
    paddingRatio: number;
    transparent?: boolean;
}) {
    const content = Math.max(
        1,
        Math.round(config.size * (1 - 2 * config.paddingRatio)),
    );
    await gmConvert([
        config.sourcePng,
        "-background",
        config.transparent ? "none" : BACKGROUND,
        ...(config.transparent ? [] : ["-flatten"]),
        "-resize",
        `${content}x${content}`,
        "-gravity",
        "center",
        "-extent",
        `${config.size}x${config.size}`,
        config.outPath,
    ]);
}

/**
 * Multi-size .ico embedding PNG images (Vista+ / all modern browsers).
 */
function buildPngIco(pngBuffers: Buffer[]): Buffer {
    const count = pngBuffers.length;
    const headerSize = 6;
    const entrySize = 16;
    const dataOffset = headerSize + entrySize * count;

    const header = Buffer.alloc(headerSize);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(count, 4);

    const entries: Buffer[] = [];
    let offset = dataOffset;
    for (const png of pngBuffers) {
        const entry = Buffer.alloc(entrySize);
        const width = png.readUInt32BE(16);
        const height = png.readUInt32BE(20);
        entry.writeUInt8(width >= 256 ? 0 : width, 0);
        entry.writeUInt8(height >= 256 ? 0 : height, 1);
        entry.writeUInt8(0, 2);
        entry.writeUInt8(0, 3);
        entry.writeUInt16LE(1, 4);
        entry.writeUInt16LE(32, 6);
        entry.writeUInt32LE(png.length, 8);
        entry.writeUInt32LE(offset, 12);
        entries.push(entry);
        offset += png.length;
    }

    return Buffer.concat([header, ...entries, ...pngBuffers]);
}

async function generateFavicon(sourcePng: string, tmpDir: string) {
    const pngPaths: string[] = [];
    for (const size of FAVICON_SIZES) {
        const path = join(tmpDir, `favicon-${size}.png`);
        await writeSquarePng({
            sourcePng,
            outPath: path,
            size,
            paddingRatio: 0.08,
            transparent: true,
        });
        pngPaths.push(path);
    }
    const buffers = await Promise.all(pngPaths.map((p) => readFile(p)));
    await writeFile(join(PUBLIC, "favicon.ico"), buildPngIco(buffers));
}

async function main() {
    await requireCommand(
        "gm",
        "GraphicsMagick is required. Install it and ensure `gm` is on PATH.",
    );
    await requireCommand(
        "rsvg-convert",
        "librsvg is required for SVG rasterization. Install librsvg (`rsvg-convert`).",
    );

    await mkdir(PUBLIC, { recursive: true });

    const logo = await readFile(LOGO_SVG, "utf8");
    if (!logo.includes(BRAND)) {
        console.warn(
            `Warning: ${LOGO_SVG} does not contain brand color ${BRAND}. Icons will use the SVG as-is.`,
        );
    }

    const tmpDir = join(PUBLIC, ".icon-tmp");
    await mkdir(tmpDir, { recursive: true });

    try {
        const sourcePng = join(tmpDir, "logo-source.png");
        await rasterizeLogo(sourcePng, 1024);

        for (const target of PNG_TARGETS) {
            const out = join(PUBLIC, target.file);
            await writeSquarePng({
                sourcePng,
                outPath: out,
                size: target.size,
                paddingRatio: target.paddingRatio,
            });
            console.log(`wrote ${target.file} (${target.size}x${target.size})`);
        }
        await generateFavicon(sourcePng, tmpDir);
        console.log("wrote favicon.ico");
    } finally {
        await rm(tmpDir, { recursive: true, force: true });
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
