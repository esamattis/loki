import { Script } from "@/components/script";

function $disableViewTransitionsInAutomation() {
    if (!navigator.webdriver) return;
    const style = document.createElement("style");
    style.textContent = "@view-transition { navigation: none; }";
    document.head.appendChild(style);
}

export function DisableViewTransitionsInAutomation() {
    return <Script $exec={$disableViewTransitionsInAutomation} />;
}
