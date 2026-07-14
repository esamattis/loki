import * as routes from "../routes";
import type { LogbookFilters } from "../logbook";

export function buildLogbookUrl(
    filters: LogbookFilters,
    overrides: { search?: string } = {},
): string {
    const query = new URLSearchParams();
    for (const uuid of filters.locationUuids) {
        query.append("locationUuids", uuid);
    }
    for (const uuid of filters.gearUuids) {
        query.append("gearUuids", uuid);
    }
    for (const uuid of filters.jumpTypeUuids) {
        query.append("jumpTypeUuids", uuid);
    }
    const search = overrides.search ?? filters.search;
    if (search) {
        query.set("search", search);
    }
    const queryString = query.toString();
    return `${routes.logbook({})}${queryString ? `?${queryString}` : ""}`;
}

export function JumpSearch(props: { filters: LogbookFilters }) {
    const hasSearch = props.filters.search !== "";
    return (
        <form
            action={routes.logbook({})}
            method="get"
            role="search"
            className="relative flex items-center"
        >
            {props.filters.locationUuids.map((uuid) => (
                <input
                    key={`loc-${uuid}`}
                    type="hidden"
                    name="locationUuids"
                    value={uuid}
                />
            ))}
            {props.filters.gearUuids.map((uuid) => (
                <input
                    key={`gear-${uuid}`}
                    type="hidden"
                    name="gearUuids"
                    value={uuid}
                />
            ))}
            {props.filters.jumpTypeUuids.map((uuid) => (
                <input
                    key={`jt-${uuid}`}
                    type="hidden"
                    name="jumpTypeUuids"
                    value={uuid}
                />
            ))}
            <svg
                aria-hidden="true"
                className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400 dark:text-slate-500"
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
            <input
                type="search"
                name="search"
                value={props.filters.search}
                placeholder="Search jumps..."
                aria-label="Search jumps"
                maxLength={200}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-9 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            />
            {hasSearch && (
                <a
                    href={buildLogbookUrl(props.filters, { search: "" })}
                    aria-label="Clear search"
                    className="absolute right-2.5 inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                    <svg
                        aria-hidden="true"
                        className="h-4 w-4"
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
                </a>
            )}
        </form>
    );
}
