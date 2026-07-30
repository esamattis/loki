import type { HonoRequestContext } from "@/core/create-app";

/** Describes server timings. */
export interface ServerTimings {
    pageStartedAt: number;
    sqlQueries: number;
    sqlDuration: number;
    longestSqlDuration: number;
}

/** Creates server timings. */
export function createServerTimings(): ServerTimings {
    return {
        pageStartedAt: performance.now(),
        sqlQueries: 0,
        sqlDuration: 0,
        longestSqlDuration: 0,
    };
}

/** Measures sql. */
export async function measureSql<T>(
    timings: ServerTimings,
    operation: () => Promise<T>,
): Promise<T> {
    const startedAt = performance.now();
    try {
        return await operation();
    } finally {
        recordSqlDuration(timings, performance.now() - startedAt);
    }
}

/** Measures sql sync. */
export function measureSqlSync<T>(
    timings: ServerTimings,
    operation: () => T,
): T {
    const startedAt = performance.now();
    try {
        return operation();
    } finally {
        recordSqlDuration(timings, performance.now() - startedAt);
    }
}

/** Records sql duration. */
function recordSqlDuration(timings: ServerTimings, duration: number): void {
    timings.sqlQueries += 1;
    timings.sqlDuration += duration;
    timings.longestSqlDuration = Math.max(timings.longestSqlDuration, duration);
}

/** Sets server timing. */
export function setServerTiming(
    c: HonoRequestContext,
    timings: ServerTimings,
): void {
    const pageDuration = performance.now() - timings.pageStartedAt;
    c.header(
        "Server-Timing",
        `sql;dur=${timings.sqlDuration.toFixed(2)}, sql-longest;dur=${timings.longestSqlDuration.toFixed(2)}, page;dur=${pageDuration.toFixed(2)}`,
    );
    c.header("X-Loki-SQL-Queries", timings.sqlQueries.toString());
}
