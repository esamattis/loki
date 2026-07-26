interface IconProps {
    className: string;
    id?: string;
}

function Icon(props: IconProps) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 6l12 12M18 6L6 18"
            />
        </svg>
    );
}
export function CloseIcon(props: IconProps) {
    return <Icon {...props} />;
}
export function EyeIcon(props: IconProps) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}
export function EyeOffIcon(props: IconProps) {
    return <Icon {...props} />;
}
export function LockIcon(props: IconProps) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <rect x="5" y="10" width="14" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
    );
}
export function ChevronRightIcon(props: IconProps) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <path d="m9 18 6-6-6-6" />
        </svg>
    );
}
export function CalendarIcon(props: IconProps) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 11h18" />
        </svg>
    );
}
export function LightThemeIcon(props: IconProps) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
        </svg>
    );
}
export function DarkThemeIcon(props: IconProps) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
        </svg>
    );
}
export function SystemThemeIcon(props: IconProps) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <rect x="3" y="4" width="18" height="14" rx="2" />
            <path d="M8 22h8M12 18v4" />
        </svg>
    );
}
