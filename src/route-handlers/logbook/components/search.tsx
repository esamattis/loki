import clsx from "clsx";
import { useId } from "hono/jsx";
import { buttonClassName, controlClassName } from "@/components/form";
import { CloseIcon, SearchIcon, SortIcon } from "@/components/icons";
import { Script } from "@/components/script";
import * as routes from "@/routes";
import type { LogbookFilters } from "@/route-handlers/logbook/index";
import { $select } from "@/utils";

const SORT_OPTIONS = [
    {
        value: "jumpNumber-desc",
        label: "Jump # · high first",
    },
    {
        value: "jumpNumber-asc",
        label: "Jump # · low first",
    },
    {
        value: "createdAt-desc",
        label: "Added · newest first",
    },
    {
        value: "createdAt-asc",
        label: "Added · oldest first",
    },
] as const;

export function logbookSortParam(filters: LogbookFilters): string {
    return `${filters.sortBy}-${filters.sortOrder}`;
}

export function isDefaultLogbookSort(filters: LogbookFilters): boolean {
    return filters.sortBy === "jumpNumber" && filters.sortOrder === "desc";
}

export function appendLogbookFilterParams(
    query: URLSearchParams,
    filters: LogbookFilters,
    overrides: { search?: string } = {},
): void {
    for (const uuid of filters.locationUuids) {
        query.append("locationUuids", uuid);
    }
    for (const uuid of filters.gearUuids) {
        query.append("gearUuids", uuid);
    }
    for (const uuid of filters.jumpTypeUuids) {
        query.append("jumpTypeUuids", uuid);
    }
    if (filters.start) {
        query.set("start", filters.start);
    }
    if (filters.end) {
        query.set("end", filters.end);
    }
    const search = overrides.search ?? filters.search;
    if (search) {
        query.set("search", search);
    }
    if (!isDefaultLogbookSort(filters)) {
        query.set("sort", logbookSortParam(filters));
    }
}

export function buildLogbookUrl(
    filters: LogbookFilters,
    overrides: { search?: string } = {},
): string {
    const query = new URLSearchParams();
    appendLogbookFilterParams(query, filters, overrides);
    const queryString = query.toString();
    return `${routes.logbook.index({})}${queryString ? `?${queryString}` : ""}`;
}

function FilterResourceHiddenFields(props: { filters: LogbookFilters }) {
    return (
        <>
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
            {props.filters.start && (
                <input type="hidden" name="start" value={props.filters.start} />
            )}
            {props.filters.end && (
                <input type="hidden" name="end" value={props.filters.end} />
            )}
        </>
    );
}

export function JumpSort(props: { filters: LogbookFilters }) {
    const id = useId();
    const sortValue = logbookSortParam(props.filters);
    return (
        <form
            action={routes.logbook.index({})}
            method="get"
            className="sm:w-56 sm:shrink-0"
        >
            <FilterResourceHiddenFields filters={props.filters} />
            {props.filters.search !== "" && (
                <input
                    type="hidden"
                    name="search"
                    value={props.filters.search}
                />
            )}
            <div className="relative">
                <SortIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <select
                    id={id}
                    name="sort"
                    aria-label="Sort jumps"
                    className={clsx(
                        controlClassName,
                        "h-10 appearance-none bg-no-repeat py-0 pl-9 pr-10 text-sm",
                    )}
                    style={{
                        backgroundImage:
                            "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
                        backgroundPosition: "right 0.6rem center",
                        backgroundSize: "1.1rem",
                    }}
                >
                    {SORT_OPTIONS.map((option) => (
                        <option
                            key={option.value}
                            value={option.value}
                            selected={option.value === sortValue}
                        >
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
            <Script
                $deps={[$select]}
                $args={[id]}
                $exec={(id) => {
                    const select = $select.id(id, HTMLSelectElement);
                    select.addEventListener("change", () => {
                        select.form?.requestSubmit();
                    });
                }}
            />
        </form>
    );
}

export function JumpSearch(props: { filters: LogbookFilters }) {
    const hasSearch = props.filters.search !== "";
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <form
                action={routes.logbook.index({})}
                method="get"
                role="search"
                className="flex min-w-0 grow items-center"
            >
                <FilterResourceHiddenFields filters={props.filters} />
                {!isDefaultLogbookSort(props.filters) && (
                    <input
                        type="hidden"
                        name="sort"
                        value={logbookSortParam(props.filters)}
                    />
                )}
                <div className="relative grow">
                    <input
                        type="search"
                        name="search"
                        value={props.filters.search}
                        placeholder="Search jumps..."
                        aria-label="Search jumps"
                        maxLength={200}
                        className={clsx(
                            controlClassName,
                            "h-10 rounded-r-none pr-9 text-sm focus:ring-indigo-500/40 [&::-webkit-search-cancel-button]:appearance-none",
                        )}
                    />
                    {hasSearch && (
                        <a
                            href={buildLogbookUrl(props.filters, {
                                search: "",
                            })}
                            aria-label="Clear search"
                            className="absolute right-2.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                            <CloseIcon className="h-4 w-4" />
                        </a>
                    )}
                </div>
                <button
                    type="submit"
                    aria-label="Search"
                    className={buttonClassName({
                        className: "-ml-px h-10 rounded-l-none px-3",
                    })}
                >
                    <SearchIcon className="h-4 w-4" />
                </button>
            </form>
            <JumpSort filters={props.filters} />
        </div>
    );
}
