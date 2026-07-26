const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN_BITS = 256;

function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

async function derivePasswordHash(
    password: string,
    salt: Uint8Array<ArrayBuffer>,
    iterations: number,
): Promise<string> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveBits"],
    );
    const derived = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt,
            iterations,
            hash: "SHA-256",
        },
        keyMaterial,
        PBKDF2_KEYLEN_BITS,
    );
    return bytesToBase64(new Uint8Array(derived));
}

export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
    const hash = await derivePasswordHash(password, salt, PBKDF2_ITERATIONS);
    return `${PBKDF2_ITERATIONS}:${bytesToBase64(salt)}:${hash}`;
}

export async function verifyPassword(
    password: string,
    storedHash: string,
): Promise<boolean> {
    const parts = storedHash.split(":");
    if (parts.length !== 3) {
        return false;
    }
    const [iterationsStr, saltBase64, hash] = parts;
    if (!iterationsStr || !saltBase64 || !hash) {
        return false;
    }
    const iterations = parseInt(iterationsStr, 10);
    if (Number.isNaN(iterations)) {
        return false;
    }
    const binary = atob(saltBase64);
    const salt = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i++) {
        salt[i] = binary.charCodeAt(i);
    }
    const computedHash = await derivePasswordHash(password, salt, iterations);
    return computedHash === hash;
}
