import { ButtonLink } from "@/components/form";
import { ImageIcon, LogbookIcon, PlusIcon } from "@/components/icons";
import { StatisticsIcon } from "@/components/menu-icons";
import * as routes from "@/routes";

export function LogbookActions(props: { pathname: string }) {
    const logbookPath = routes.logbook.index({});
    const statisticsPath = routes.logbook.statistics.index({});
    const newJumpPath = routes.logbook.jumps.new({}, {});
    const fromImagePath = routes.logbook.jumps.fromImage({});

    return (
        <nav className="flex flex-wrap items-center justify-around sm:justify-start sm:gap-2">
            <ButtonLink
                href={logbookPath}
                icon={<LogbookIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                variant={
                    props.pathname === logbookPath ? "primary" : "secondary"
                }
                aria-label="Logbook"
                aria-current={
                    props.pathname === logbookPath ? "page" : undefined
                }
                data-loki-tooltip="Show jump list"
                className="gap-1 rounded-md px-2 py-1.5 text-xs font-medium sm:gap-1.5 sm:rounded-lg sm:px-3.5 sm:py-2 sm:text-sm"
            >
                <span className="hidden sm:inline">Logbook</span>
            </ButtonLink>
            <ButtonLink
                href={statisticsPath}
                icon={<StatisticsIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                variant={
                    props.pathname.startsWith(statisticsPath)
                        ? "primary"
                        : "secondary"
                }
                aria-label="Statistics"
                aria-current={
                    props.pathname.startsWith(statisticsPath)
                        ? "page"
                        : undefined
                }
                data-loki-tooltip="Show statistics"
                className="gap-1 rounded-md px-2 py-1.5 text-xs font-medium sm:gap-1.5 sm:rounded-lg sm:px-3.5 sm:py-2 sm:text-sm"
            >
                <span className="hidden sm:inline">Statistics</span>
            </ButtonLink>
            <span
                aria-hidden="true"
                className="mx-0.5 h-6 w-px flex-none bg-slate-200 dark:bg-slate-700"
            />
            <ButtonLink
                href={newJumpPath}
                icon={<PlusIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                variant={
                    props.pathname === newJumpPath ? "primary" : "secondary"
                }
                aria-label="Add jump"
                aria-current={
                    props.pathname === newJumpPath ? "page" : undefined
                }
                data-loki-tooltip="Add jump"
                className="gap-1 rounded-md px-2 py-1.5 text-xs font-medium sm:gap-1.5 sm:rounded-lg sm:px-3.5 sm:py-2 sm:text-sm"
            >
                <span className="hidden sm:inline">Add jump</span>
            </ButtonLink>
            <ButtonLink
                href={fromImagePath}
                icon={<ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                variant={
                    props.pathname === fromImagePath ? "primary" : "secondary"
                }
                aria-label="AI Vision"
                aria-current={
                    props.pathname === fromImagePath ? "page" : undefined
                }
                data-loki-tooltip="AI Vision"
                className="gap-1 rounded-md px-2 py-1.5 text-xs font-medium sm:gap-1.5 sm:rounded-lg sm:px-3.5 sm:py-2 sm:text-sm"
            >
                <span className="hidden sm:inline">AI Vision</span>
            </ButtonLink>
        </nav>
    );
}
