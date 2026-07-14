import { Script } from "@/components/script";

function $applyStoredTheme() {
    try {
        let theme = localStorage.getItem("theme");
        if (theme !== "light" && theme !== "dark") theme = "system";
        const isDark =
            theme === "dark" ||
            (theme === "system" &&
                matchMedia("(prefers-color-scheme: dark)").matches);
        document.documentElement.classList.toggle("dark", isDark);
        document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    } catch {
        // Ignore unavailable local storage.
    }
}

export function ThemeScript() {
    return <Script $exec={$applyStoredTheme} />;
}
