interface MenuIconProps {
    className: string;
    path: string;
}

function MenuIcon(props: MenuIconProps) {
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

export function AircraftIcon(props: { className: string }) {
    return (
        <MenuIcon
            className={props.className}
            path="M3 11.5l7.5-2.5V4.5a1.5 1.5 0 013 0V9l7.5 2.5v2l-7.5-1v4l2.5 2v1l-4-1-4 1v-1l2.5-2v-4L3 13.5v-2z"
        />
    );
}

export function GearIcon(props: { className: string }) {
    return (
        <MenuIcon
            className={props.className}
            path="M8 7V5a4 4 0 018 0v2m-9 0h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2zm2 5h6m-6 4h6"
        />
    );
}

export function JumpTypeIcon(props: { className: string }) {
    return (
        <MenuIcon
            className={props.className}
            path="M3 10a9 9 0 0118 0H3zm0 0l4 4 5-4 5 4 4-4M12 10v9m-2 2h4"
        />
    );
}

export function LocationIcon(props: { className: string }) {
    return (
        <MenuIcon
            className={props.className}
            path="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1116 0zm-5 0a3 3 0 11-6 0 3 3 0 016 0z"
        />
    );
}

export function StatisticsIcon(props: { className: string }) {
    return (
        <MenuIcon
            className={props.className}
            path="M4 20V10h4v10H4zm6 0V4h4v16h-4zm6 0v-7h4v7h-4z"
        />
    );
}

export function TransferIcon(props: { className: string }) {
    return (
        <MenuIcon
            className={props.className}
            path="M4 7h15m-4-4l4 4-4 4m5 6H5m4 4l-4-4 4-4"
        />
    );
}

export function AdminIcon(props: { className: string }) {
    return (
        <MenuIcon
            className={props.className}
            path="M12 3l8 3v5c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6l8-3zm0 5v4m0 4h.01"
        />
    );
}

export function PreferencesIcon(props: { className: string }) {
    return (
        <MenuIcon
            className={props.className}
            path="M12 8a4 4 0 100 8 4 4 0 000-8zm0-5v2m0 14v2M3 12h2m14 0h2M5.64 5.64l1.42 1.42m9.88 9.88l1.42 1.42m0-12.72l-1.42 1.42m-9.88 9.88l-1.42 1.42"
        />
    );
}

export function InstallIcon(props: { className: string }) {
    return (
        <MenuIcon
            className={props.className}
            path="M12 3v12m-4-4l4 4 4-4M5 18v2h14v-2"
        />
    );
}

export function AboutIcon(props: { className: string }) {
    return (
        <MenuIcon
            className={props.className}
            path="M12 11v6m0-10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    );
}

export function LogoutIcon(props: { className: string }) {
    return (
        <MenuIcon
            className={props.className}
            path="M10 5H5a2 2 0 00-2 2v10a2 2 0 002 2h5m4-4l4-3-4-3m4 3H8"
        />
    );
}
