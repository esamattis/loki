import { useRequestContext, type RequestContext } from "@/core/create-app";
import { LokiUserOptionsSchema } from "@/app/options";
import {
    createAltitudeFormatter,
    createDistanceFormatter,
    createSpeedFormatter,
} from "@/app/format";

export function lokiFormatters(context: RequestContext) {
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
    return lokiFormatters(useRequestContext()).altitude;
}

export function useSpeedFormatter() {
    return lokiFormatters(useRequestContext()).speed;
}
