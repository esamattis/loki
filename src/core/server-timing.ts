import type { AppRequestContext } from "@/core/create-app";

export interface ServerTimings {
    pageStartedAt: number;
    sqlQueries: number;
    sqlDuration: number;
    longestSqlDuration: number;
}

export function createServerTimings(): ServerTimings {
    return {
        pageStartedAt: performance.now(),
        sqlQueries: 0,
        sqlDuration: 0,
        longestSqlDuration: 0,
    };
}

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

function recordSqlDuration(timings: ServerTimings, duration: number): void {
    timings.sqlQueries += 1;
    timings.sqlDuration += duration;
    timings.longestSqlDuration = Math.max(timings.longestSqlDuration, duration);
}

export function setServerTiming(
    c: AppRequestContext,
    timings: ServerTimings,
): void {
    const pageDuration = performance.now() - timings.pageStartedAt;
    c.header(
        "Server-Timing",
        `sql;dur=${timings.sqlDuration.toFixed(2)}, sql-longest;dur=${timings.longestSqlDuration.toFixed(2)}, page;dur=${pageDuration.toFixed(2)}`,
    );
    c.header("X-Loki-SQL-Queries", timings.sqlQueries.toString());
}
