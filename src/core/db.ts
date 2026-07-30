import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { measureSql, type ServerTimings } from "@/core/server-timing";

/** App DB client. D1-shaped so existing `.batch` / query typings keep working. */
export type AppDatabase = ReturnType<typeof drizzleD1>;

/** Provides timed d1 prepared statement behavior. */
class TimedD1PreparedStatement {
    /** Creates a timing wrapper around a D1 prepared statement. */
    constructor(
        private readonly statement: D1PreparedStatement,
        private readonly timings: ServerTimings,
    ) {}

    /** Returns the wrapped D1 prepared statement. */
    original(): D1PreparedStatement {
        return this.statement;
    }

    /** Binds values and preserves query timing on the returned statement. */
    bind(...values: unknown[]): D1PreparedStatement {
        return new TimedD1PreparedStatement(
            this.statement.bind(...values),
            this.timings,
        );
    }

    /** Returns one column from the first matching row. */
    first<T = unknown>(columnName: string): Promise<T | null>;
    /** Returns the first matching row. */
    first<T = Record<string, unknown>>(): Promise<T | null>;
    /** Executes a timed first-row query with an optional column selection. */
    first<T>(columnName?: string): Promise<T | null> {
        return measureSql(this.timings, () =>
            columnName === undefined
                ? this.statement.first<T>()
                : this.statement.first<T>(columnName),
        );
    }

    /** Executes the prepared statement and records its duration. */
    run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        return measureSql(this.timings, () => this.statement.run<T>());
    }

    /** Returns all matching rows and records the query duration. */
    all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        return measureSql(this.timings, () => this.statement.all<T>());
    }

    /** Returns raw rows prefixed with their column names. */
    raw<T = unknown[]>(options: {
        columnNames: true;
    }): Promise<[string[], ...T[]]>;
    /** Returns raw rows without a column-name prefix. */
    raw<T = unknown[]>(options?: { columnNames?: false }): Promise<T[]>;
    /** Executes a timed raw-row query with optional column names. */
    raw<T = unknown[]>(options?: {
        columnNames?: boolean;
    }): Promise<T[] | [string[], ...T[]]> {
        if (options?.columnNames) {
            return measureSql(this.timings, () =>
                this.statement.raw<T>({ columnNames: true }),
            );
        }
        return measureSql(this.timings, () => this.statement.raw<T>());
    }
}

/** Provides timed d1 database behavior. */
class TimedD1Database {
    /** Creates a timing wrapper around a D1 database. */
    constructor(
        private readonly database: D1Database,
        private readonly timings: ServerTimings,
    ) {}

    /** Prepares a query and wraps the statement with timing instrumentation. */
    prepare(query: string): D1PreparedStatement {
        return new TimedD1PreparedStatement(
            this.database.prepare(query),
            this.timings,
        );
    }

    /** Executes a batch of wrapped statements and records its duration. */
    batch<T = unknown>(
        statements: D1PreparedStatement[],
    ): Promise<D1Result<T>[]> {
        const originals = statements.map((statement) => {
            if (!(statement instanceof TimedD1PreparedStatement)) {
                throw new Error("Expected a timed D1 prepared statement");
            }
            return statement.original();
        });
        return measureSql(this.timings, () =>
            this.database.batch<T>(originals),
        );
    }

    /** Executes a SQL string and records its duration. */
    exec(query: string): Promise<D1ExecResult> {
        return measureSql(this.timings, () => this.database.exec(query));
    }

    /** Starts a D1 session using an optional bookmark constraint. */
    withSession(
        constraintOrBookmark?: D1SessionBookmark | D1SessionConstraint,
    ): D1DatabaseSession {
        return this.database.withSession(constraintOrBookmark);
    }

    /** Dumps the wrapped D1 database. */
    dump(): Promise<ArrayBuffer> {
        return this.database.dump();
    }
}

/** Creates d1 database. */
export function createD1Database(
    d1: D1Database,
    timings?: ServerTimings,
): AppDatabase {
    return drizzleD1(timings ? new TimedD1Database(d1, timings) : d1);
}
