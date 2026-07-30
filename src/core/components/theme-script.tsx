import { Script } from "@/core/components/script";

/** Applies the `localStorage` theme (`light` | `dark` | system) before paint. */
function $applyStoredTheme() {
    try {
        let theme = localStorage.getItem("theme");
        if (theme !== "light" && theme !== "dark") theme = "system";
        document.documentElement.classList.toggle("light", theme === "light");
        document.documentElement.classList.toggle("dark", theme === "dark");
        document.documentElement.style.removeProperty("color-scheme");
    } catch (error) {
        console.error("Failed to apply the stored theme", error);
    }
}

/**
 * Early inline script that sets `light`/`dark` classes from stored preference
 * so the first paint matches the user's theme.
 */
export function ThemeScript() {
    return <Script $exec={$applyStoredTheme} />;
}
