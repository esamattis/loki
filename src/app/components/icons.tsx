interface IconProps {
    className: string;
    id?: string;
}

export function BurgerMenuIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
            />
        </svg>
    );
}

export function PlusIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2.5"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 4v16m8-8H4"
            />
        </svg>
    );
}

export function LogbookIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 6h16M4 12h10M4 18h14"
            />
        </svg>
    );
}

export function ImageIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
        </svg>
    );
}

export function CameraIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 8a2 2 0 012-2h2l1.5-2h7L17 6h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
            />
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.5 13a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z"
            />
        </svg>
    );
}

export function CalendarIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z"
            />
        </svg>
    );
}

export function ClipboardIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 5h6m-6 0a2 2 0 012-2h2a2 2 0 012 2m-6 0a2 2 0 00-2 2v1m8-3a2 2 0 012 2v1M7 8H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2h-2M7 8h10"
            />
        </svg>
    );
}

export function LightThemeIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0l-1.414-1.414M7.05 7.05 5.636 5.636M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
        </svg>
    );
}

export function DarkThemeIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
            />
        </svg>
    );
}

export function SystemThemeIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path d="M12 4a8 8 0 000 16V4z" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="8" />
        </svg>
    );
}

export function ExportIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12"
            />
        </svg>
    );
}

export function ImportIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M17 14l-5 5m0 0l-5-5m5 5V7"
            />
        </svg>
    );
}

export function ChevronRightIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 5l7 7-7 7"
            />
        </svg>
    );
}

export function ChevronUpIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M5 15l7-7 7 7"
            />
        </svg>
    );
}

export function SearchIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
            />
        </svg>
    );
}

export function GoToJumpIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 3v3m0 12v3M3 12h3m12 0h3"
            />
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="7" />
        </svg>
    );
}

export function CloseIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18L18 6M6 6l12 12"
            />
        </svg>
    );
}

export function CopyIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
        </svg>
    );
}

export function EyeIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
        </svg>
    );
}

export function EyeOffIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 3l18 18M10.585 10.586a2 2 0 002.829 2.828M9.88 5.09A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.975 9.975 0 01-1.272 2.592M6.228 6.228C4.51 7.41 3.18 9.421 2.458 12c1.274 4.057 5.065 7 9.542 7 1.29 0 2.522-.244 3.655-.688"
            />
        </svg>
    );
}

export function SortIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 7h12M3 12h8M3 17h4M17 5v14m0 0l-3-3m3 3l3-3"
            />
        </svg>
    );
}

export function LockIcon(props: IconProps) {
    return (
        <svg
            id={props.id}
            aria-hidden="true"
            className={props.className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
        </svg>
    );
}
