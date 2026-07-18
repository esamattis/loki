import type { AppRequestContext } from "@/app/app";

export interface ServerTimings {
    pageStartedAt: number;
    sqlDuration: number;
    longestSqlDuration: number;
}

export function createServerTimings(): ServerTimings {
    return {
        pageStartedAt: performance.now(),
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
}

export function updatePageServerTiming(
    c: AppRequestContext,
    timings: ServerTimings,
): void {
    const currentHeader = c.res.headers.get("Server-Timing");
    if (!currentHeader) {
        setServerTiming(c, timings);
        return;
    }

    const sqlMetrics = currentHeader
        .split(",")
        .map((metric) => metric.trim())
        .filter((metric) => !metric.startsWith("page;"));
    const pageDuration = performance.now() - timings.pageStartedAt;
    c.header(
        "Server-Timing",
        [...sqlMetrics, `page;dur=${pageDuration.toFixed(2)}`].join(", "),
    );
}
