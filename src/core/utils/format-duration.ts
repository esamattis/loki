export function formatDuration(totalSeconds: number): string {
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];
    if (days > 0) {
        parts.push(`${days}d`);
    }
    if (hours > 0 || days > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0 || hours > 0 || days > 0) {
        parts.push(`${minutes}min`);
    }
    parts.push(`${seconds}s`);
    return parts.join(" ");
}
