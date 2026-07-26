export const METERS_PER_FOOT = 0.3048;

export type AltitudeUnit = "meters" | "feet";

export function altitudeToMeters(
    altitude: number,
    units: AltitudeUnit,
): number {
    if (units === "feet") {
        return Math.round(altitude * METERS_PER_FOOT);
    }
    return Math.round(altitude);
}
