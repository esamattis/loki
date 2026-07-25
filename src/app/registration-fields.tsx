import { useId } from "hono/jsx";
import { Script } from "@/core/components/script";
import { $select } from "@/core/utils";

function $setLokiRegistrationUnits(containerId: string) {
    const container = $select.id(containerId, HTMLDivElement);
    const region = new Intl.Locale(navigator.language).maximize().region ?? "";
    const imperial = ["US", "LR", "MM"].includes(region);
    $select.el('[name="altitudeUnits"]', HTMLInputElement, container).value =
        imperial ? "feet" : "meters";
    $select.el('[name="speedUnits"]', HTMLInputElement, container).value =
        imperial ? "miles-per-hour" : "kilometers-per-hour";
}

export function LokiRegistrationFields() {
    const id = useId();
    return (
        <div id={id} hidden>
            <input type="hidden" name="altitudeUnits" value="meters" />
            <input
                type="hidden"
                name="speedUnits"
                value="kilometers-per-hour"
            />
            <Script
                $deps={[$select]}
                $args={[id]}
                $exec={$setLokiRegistrationUnits}
            />
        </div>
    );
}
