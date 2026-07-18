import { useId } from "hono/jsx";
import { Script } from "@/components/script";
import { $elAll, $elById, $renderTemplate } from "@/utils";

function $disableViewTransitionsInAutomation(templateId: string) {
    if (!navigator.webdriver) return;
    const container = document.createElement("div");
    $renderTemplate(container, templateId);
    const style = container.firstElementChild;
    if (!(style instanceof HTMLStyleElement)) return;
    document.head.appendChild(style);
}

export function DisableViewTransitionsInAutomation() {
    const templateId = useId();
    return (
        <>
            <template id={templateId}>
                <style>{`@view-transition { navigation: none; }`}</style>
            </template>
            <Script
                $deps={[$elAll, $elById, $renderTemplate]}
                $args={[templateId]}
                $exec={$disableViewTransitionsInAutomation}
            />
        </>
    );
}
