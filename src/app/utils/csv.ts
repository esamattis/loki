export interface CsvRow {
    fields: string[];
    line: number;
}

export type CsvParseResult =
    | { success: true; rows: CsvRow[] }
    | {
          success: false;
          error: { line: number; message: string };
      };

/** Parses CSV content into fields while preserving each row's starting line. */
export function parseCsvRows(content: string): CsvParseResult {
    const rows: CsvRow[] = [];
    let fields: string[] = [];
    let current = "";
    let inQuotes = false;
    let quotedFieldLine = 1;
    let hasContent = false;
    let line = 1;
    let rowLine = 1;
    for (let i = 0; i < content.length; i++) {
        const ch = content[i]!;
        if (i === 0 && ch === "\uFEFF") {
            continue;
        }
        if (inQuotes) {
            if (ch === '"') {
                hasContent = true;
                if (content[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else if (ch === "\r" || ch === "\n") {
                current += "\n";
                if (ch === "\r" && content[i + 1] === "\n") {
                    i++;
                }
                line++;
            } else {
                current += ch;
                hasContent ||= ch.trim().length > 0;
            }
        } else if (ch === '"') {
            inQuotes = true;
            quotedFieldLine = line;
            hasContent = true;
        } else if (ch === ",") {
            fields.push(current);
            current = "";
            hasContent = true;
        } else if (ch === "\r" || ch === "\n") {
            if (hasContent) {
                fields.push(current);
                rows.push({ fields, line: rowLine });
            }
            fields = [];
            current = "";
            hasContent = false;
            if (ch === "\r" && content[i + 1] === "\n") {
                i++;
            }
            line++;
            rowLine = line;
        } else {
            current += ch;
            hasContent ||= ch.trim().length > 0;
        }
    }
    if (inQuotes) {
        return {
            success: false,
            error: {
                line: quotedFieldLine,
                message: "Unterminated quoted field",
            },
        };
    }
    if (hasContent) {
        fields.push(current);
        rows.push({ fields, line: rowLine });
    }
    return { success: true, rows };
}

/** Splits a semicolon-separated CSV field, treating doubled semicolons as one. */
export function splitCsvList(value: string): string[] {
    if (!value.trim()) {
        return [];
    }
    const items: string[] = [];
    let current = "";
    for (let i = 0; i < value.length; i++) {
        if (value[i] === ";") {
            if (value[i + 1] === ";") {
                current += ";";
                i++;
            } else if (value[i + 1] === " ") {
                items.push(current);
                current = "";
                i++;
            } else {
                items.push(current);
                current = "";
            }
        } else {
            current += value[i]!;
        }
    }
    items.push(current);
    return items.map((item) => item.trim()).filter((item) => item.length > 0);
}
