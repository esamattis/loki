import { useId } from "hono/jsx";
import { Script } from "@/components/script";
import { $renderTemplate } from "@/utils";

function $disableViewTransitionsInAutomation(templateId: string) {
    if (!navigator.webdriver) return;
    document.head.appendChild($renderTemplate(templateId));
}

export function DisableViewTransitionsInAutomation() {
    const templateId = useId();
    return (
        <>
            <template id={templateId}>
                <style>{`@view-transition { navigation: none; }`}</style>
            </template>
            <Script
                $deps={[$renderTemplate]}
                $args={[templateId]}
                $exec={$disableViewTransitionsInAutomation}
            />
        </>
    );
}
