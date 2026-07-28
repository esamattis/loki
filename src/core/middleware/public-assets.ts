/** Returns whether public asset path. */
export function isPublicAssetPath(path: string): boolean {
    return path.startsWith("/assets/");
}
