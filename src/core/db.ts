import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { measureSql, type ServerTimings } from "@/server-timing";

/** App DB client. D1-shaped so existing `.batch` / query typings keep working. */
export type AppDatabase = ReturnType<typeof drizzleD1>;

class TimedD1PreparedStatement {
    constructor(
        private readonly statement: D1PreparedStatement,
        private readonly timings: ServerTimings,
    ) {}

    original(): D1PreparedStatement {
        return this.statement;
    }

    bind(...values: unknown[]): D1PreparedStatement {
        return new TimedD1PreparedStatement(
            this.statement.bind(...values),
            this.timings,
        );
    }

    first<T = unknown>(columnName: string): Promise<T | null>;
    first<T = Record<string, unknown>>(): Promise<T | null>;
    first<T>(columnName?: string): Promise<T | null> {
        return measureSql(this.timings, () =>
            columnName === undefined
                ? this.statement.first<T>()
                : this.statement.first<T>(columnName),
        );
    }

    run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        return measureSql(this.timings, () => this.statement.run<T>());
    }

    all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        return measureSql(this.timings, () => this.statement.all<T>());
    }

    raw<T = unknown[]>(options: {
        columnNames: true;
    }): Promise<[string[], ...T[]]>;
    raw<T = unknown[]>(options?: { columnNames?: false }): Promise<T[]>;
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

class TimedD1Database {
    constructor(
        private readonly database: D1Database,
        private readonly timings: ServerTimings,
    ) {}

    prepare(query: string): D1PreparedStatement {
        return new TimedD1PreparedStatement(
            this.database.prepare(query),
            this.timings,
        );
    }

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

    exec(query: string): Promise<D1ExecResult> {
        return measureSql(this.timings, () => this.database.exec(query));
    }

    withSession(
        constraintOrBookmark?: D1SessionBookmark | D1SessionConstraint,
    ): D1DatabaseSession {
        return this.database.withSession(constraintOrBookmark);
    }

    dump(): Promise<ArrayBuffer> {
        return this.database.dump();
    }
}

export function createD1Database(
    d1: D1Database,
    timings?: ServerTimings,
): AppDatabase {
    return drizzleD1(timings ? new TimedD1Database(d1, timings) : d1);
}
