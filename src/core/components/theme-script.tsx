import { Script } from "@/components/script";

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

export function ThemeScript() {
    return <Script $exec={$applyStoredTheme} />;
}
