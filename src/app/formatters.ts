import { useAppContext, type AppContext } from "@/core/create-app";
import { LokiUserOptionsSchema } from "@/app/options";
import {
    createAltitudeFormatter,
    createDistanceFormatter,
    createSpeedFormatter,
} from "@/app/format";

export function lokiFormatters(context: AppContext) {
    const options = LokiUserOptionsSchema.parse(context.getUser().options);
    return {
        altitude: createAltitudeFormatter(
            options.altitudeUnits,
            options.numberFormat,
        ),
        distance: createDistanceFormatter(
            options.altitudeUnits,
            context.numberFormatter(),
        ),
        speed: createSpeedFormatter(options.speedUnits, options.numberFormat),
    };
}

export function useAltitudeFormatter() {
    return lokiFormatters(useAppContext()).altitude;
}

export function useSpeedFormatter() {
    return lokiFormatters(useAppContext()).speed;
}
