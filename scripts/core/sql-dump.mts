export function splitSqlStatements(sql: string): string[] {
    const statements: string[] = [];
    let current = "";
    let inSingle = false;
    let inDouble = false;

    for (let i = 0; i < sql.length; i++) {
        const ch = sql[i]!;

        if (ch === "'" && !inDouble) {
            if (inSingle && sql[i + 1] === "'") {
                current += "''";
                i++;
                continue;
            }
            inSingle = !inSingle;
            current += ch;
            continue;
        }

        if (ch === '"' && !inSingle) {
            inDouble = !inDouble;
            current += ch;
            continue;
        }

        if (ch === ";" && !inSingle && !inDouble) {
            const trimmed = current.trim();
            if (trimmed.length > 0) {
                statements.push(trimmed);
            }
            current = "";
            continue;
        }

        current += ch;
    }

    const trailing = current.trim();
    if (trailing.length > 0) {
        statements.push(trailing);
    }
    return statements;
}

function createTableName(statement: string): string | null {
    const match = statement.match(
        /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"[]?([^`"\]\s]+)[`"\]]?/i,
    );
    return match?.[1] ?? null;
}

function insertTableName(statement: string): string | null {
    const match = statement.match(
        /^INSERT\s+INTO\s+[`"[]?([^`"\]\s]+)[`"\]]?/i,
    );
    return match?.[1] ?? null;
}

function referencedTables(statement: string): string[] {
    const refs = new Set<string>();
    const re = /REFERENCES\s+[`"[]?([^`"\]\s(]+)[`"\]]?\s*\(/gi;
    for (const match of statement.matchAll(re)) {
        refs.add(match[1]!);
    }
    return [...refs];
}

/**
 * Topological sort: parent tables before child tables.
 *
 * D1 always enforces foreign keys (equivalent to SQLite's
 * `PRAGMA foreign_keys = ON`). You cannot turn them off for a session.
 * `PRAGMA defer_foreign_keys = on` only postpones *row-level* checks until
 * the end of the current transaction — it does **not** allow
 * `CREATE TABLE ... REFERENCES parent` when `parent` does not exist yet
 * (that fails immediately with `no such table`).
 *
 * Wrangler `d1 export` emits tables in arbitrary order, so child CREATE
 * statements often appear before their parents. Import and drop both need
 * this FK order (create/insert: parents first; drop: reverse of this).
 */
export function orderTableNamesByFk(
    items: Array<{ name: string; statement: string }>,
): string[] {
    const byName = new Map(items.map((item) => [item.name, item.statement]));
    const ordered: string[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    function visit(name: string): void {
        if (visited.has(name) || !byName.has(name)) {
            return;
        }
        if (visiting.has(name)) {
            throw new Error(
                `Circular foreign key dependency involving ${name}`,
            );
        }
        const statement = byName.get(name)!;
        visiting.add(name);
        for (const dep of referencedTables(statement)) {
            visit(dep);
        }
        visiting.delete(name);
        visited.add(name);
        ordered.push(name);
    }

    for (const name of byName.keys()) {
        visit(name);
    }
    return ordered;
}

function orderByFkDeps(
    items: Array<{ name: string; statement: string }>,
): string[] {
    const byName = new Map(items.map((item) => [item.name, item.statement]));
    return orderTableNamesByFk(items).map((name) => byName.get(name)!);
}

/**
 * Rewrite a wrangler `d1 export` dump for D1 import.
 *
 * Why reordering is required:
 * - D1 keeps foreign keys on at all times; `PRAGMA foreign_keys = OFF` is not
 *   a usable escape hatch like on desktop SQLite.
 * - `PRAGMA defer_foreign_keys = on` (included below) only defers constraint
 *   validation for INSERT/UPDATE until commit. It does not allow creating a
 *   table that REFERENCES another table that has not been created yet.
 * - Raw dumps interleave CREATE/INSERT per table in export order, so a child
 *   table can be created (or filled) before its parent exists →
 *   `no such table: main.<parent>` or FK constraint rollback.
 *
 * This rewrites the dump to: deferred FKs pragma, then each table's CREATE
 * followed by its INSERTs, in parent-before-child order.
 */
export function rewriteDumpForImport(sql: string): string {
    const statements = splitSqlStatements(sql);
    const creates: Array<{ name: string; statement: string }> = [];
    const insertsByTable = new Map<string, string[]>();
    const other: string[] = [];

    for (const statement of statements) {
        if (/^CREATE\s+TABLE\b/i.test(statement)) {
            const name = createTableName(statement);
            if (!name) {
                throw new Error(
                    `Could not parse CREATE TABLE: ${statement.slice(0, 80)}`,
                );
            }
            creates.push({ name, statement });
            continue;
        }

        if (/^INSERT\s+INTO\b/i.test(statement)) {
            const name = insertTableName(statement);
            if (!name) {
                throw new Error(
                    `Could not parse INSERT INTO: ${statement.slice(0, 80)}`,
                );
            }
            // Managed automatically; replaying can fail on empty DB.
            if (name === "sqlite_sequence") {
                continue;
            }
            const list = insertsByTable.get(name) ?? [];
            list.push(statement);
            insertsByTable.set(name, list);
            continue;
        }

        if (/^PRAGMA\b/i.test(statement)) {
            continue;
        }

        other.push(statement);
    }

    const orderedCreates = orderByFkDeps(creates);
    const lines = ["PRAGMA defer_foreign_keys = on;"];

    for (const create of orderedCreates) {
        const name = createTableName(create)!;
        lines.push(`${create};`);
        for (const insert of insertsByTable.get(name) ?? []) {
            lines.push(`${insert};`);
        }
        insertsByTable.delete(name);
    }

    // Inserts for tables without CREATE in this dump (unlikely).
    for (const inserts of insertsByTable.values()) {
        for (const insert of inserts) {
            lines.push(`${insert};`);
        }
    }

    for (const statement of other) {
        lines.push(`${statement};`);
    }

    lines.push("");
    return lines.join("\n");
}
