/** Shared props for inline SVG icons. */
interface IconProps {
    /** Tailwind size/color classes for the SVG. */
    className: string;
    /** Optional element id (e.g. for theme toggle icon targets). */
    id?: string;
}

/** Hamburger menu icon (three horizontal lines). */
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

/** Base SVG used by simple path icons (currently close/X). */
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

/** Close / clear (X) icon. */
export function CloseIcon(props: IconProps) {
    return <Icon {...props} />;
}

/** Eye / visible icon. */
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

/** Eye-off / hidden icon (shares the close path until a dedicated glyph exists). */
export function EyeOffIcon(props: IconProps) {
    return <Icon {...props} />;
}

/** Padlock icon. */
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

/** Chevron pointing right (used in expandable details). */
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

/** Calendar icon for date pickers. */
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

/** Sun icon representing the light color theme. */
export function LightThemeIcon(props: IconProps) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
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

/** Moon icon representing the dark color theme. */
export function DarkThemeIcon(props: IconProps) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
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

/** Half-filled circle representing the system color theme. */
export function SystemThemeIcon(props: IconProps) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        >
            <path d="M12 4a8 8 0 000 16V4z" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="8" />
        </svg>
    );
}

/**
 * Shared Tailwind classes for icons beside account-menu labels.
 */
export const menuIconClassName =
    "h-4 w-4 flex-none text-slate-400 dark:text-slate-500";

/** Single-path menu icon used by admin/preferences/logout glyphs. */
function MenuIcon(props: { className: string; path: string }) {
    return (
        <svg
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
                d={props.path}
            />
        </svg>
    );
}

/**
 * Shield icon for admin navigation.
 *
 * @param props.className - Tailwind classes for the SVG.
 */
export function AdminIcon(props: { className: string }) {
    return (
        <MenuIcon
            className={props.className}
            path="M12 3l8 3v5c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6l8-3zm0 5v4m0 4h.01"
        />
    );
}

/**
 * Gear icon for preferences navigation.
 *
 * @param props.className - Tailwind classes for the SVG.
 */
export function PreferencesIcon(props: { className: string }) {
    return (
        <MenuIcon
            className={props.className}
            path="M12 8a4 4 0 100 8 4 4 0 000-8zm0-5v2m0 14v2M3 12h2m14 0h2M5.64 5.64l1.42 1.42m9.88 9.88l1.42 1.42m0-12.72l-1.42 1.42m-9.88 9.88l-1.42 1.42"
        />
    );
}

/**
 * Door/exit icon for logout actions.
 *
 * @param props.className - Tailwind classes for the SVG.
 */
export function LogoutIcon(props: { className: string }) {
    return (
        <MenuIcon
            className={props.className}
            path="M10 5H5a2 2 0 00-2 2v10a2 2 0 002 2h5m4-4l4-3-4-3m4 3H8"
        />
    );
}

/**
 * Document icon for printable report navigation.
 *
 * @param props.className - Tailwind classes for the SVG.
 */
export function PrintableReportIcon(props: { className: string }) {
    return (
        <MenuIcon
            className={props.className}
            path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
    );
}

/**
 * Download icon for import navigation.
 *
 * @param props.className - Tailwind classes for the SVG.
 */
export function ImportIcon(props: { className: string }) {
    return (
        <MenuIcon
            className={props.className}
            path="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4 4m0 0l-4-4m4 4V4"
        />
    );
}

/**
 * Calendar icon for holidays navigation.
 *
 * @param props.className - Tailwind classes for the SVG.
 */
export function HolidaysIcon(props: { className: string }) {
    return (
        <MenuIcon
            className={props.className}
            path="M8 3v4m8-4v4M4 9h16M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2zm3 8h.01M12 13h.01M15 13h.01M9 17h.01M12 17h.01M15 17h.01"
        />
    );
}

/**
 * Scale icon for balance navigation.
 *
 * @param props.className - Tailwind classes for the SVG.
 */
export function BalanceIcon(props: { className: string }) {
    return (
        <MenuIcon
            className={props.className}
            path="M12 3v18M5 7h14M5 7l-3 6h6L5 7zm14 0l-3 6h6l-3-6zM8 21h8"
        />
    );
}

/**
 * Bar chart icon for chart navigation.
 *
 * @param props.className - Tailwind classes for the SVG.
 */
export function ChartIcon(props: { className: string }) {
    return (
        <MenuIcon
            className={props.className}
            path="M4 20V10h4v10H4zm6 0V4h4v16h-4zm6 0v-7h4v7h-4z"
        />
    );
}
