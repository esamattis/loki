import { useId } from "hono/jsx";
import { Script } from "@/core/components/script";
import { $renderTemplate, $select } from "@/core/utils";

/**
 * When `navigator.webdriver` is set, injects CSS that disables view transitions
 * so automated tests are not flaky.
 */
function $disableViewTransitionsInAutomation(templateId: string) {
    if (!navigator.webdriver) return;
    const container = document.createElement("div");
    $renderTemplate(container, templateId);
    const style = container.firstElementChild;
    if (!(style instanceof HTMLStyleElement)) return;
    document.head.appendChild(style);
}

/**
 * Disables CSS view transitions under WebDriver (Playwright, etc.).
 * No-op for normal users.
 */
export function DisableViewTransitionsInAutomation() {
    const templateId = useId();
    return (
        <>
            <template id={templateId}>
                <style>{`@view-transition { navigation: none; }`}</style>
            </template>
            <Script
                $deps={[$select, $renderTemplate]}
                $args={[templateId]}
                $exec={$disableViewTransitionsInAutomation}
            />
        </>
    );
}
