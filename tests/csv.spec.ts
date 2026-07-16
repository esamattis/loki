import { expect, test } from "@playwright/test";
import { parseCsvRows, splitCsvList, type CsvRow } from "@/utils/csv";

function parseRows(content: string): CsvRow[] {
    const result = parseCsvRows(content);
    if (!result.success) {
        throw new Error(result.error.message);
    }
    return result.rows;
}

test.describe("parseCsvRows", () => {
    test("returns no rows for empty and whitespace-only content", () => {
        expect(parseRows("")).toEqual([]);
        expect(parseRows(" \t\r\n\r\n  \n")).toEqual([]);
    });

    test("preserves empty fields, whitespace, and a trailing field", () => {
        expect(parseRows("first, two ,,\n")).toEqual([
            { fields: ["first", " two ", "", ""], line: 1 },
        ]);
        expect(parseRows(",")).toEqual([{ fields: ["", ""], line: 1 }]);
    });

    test("parses quoted commas and doubled quotes", () => {
        expect(parseRows('plain,"with, comma","quote ""inside""",""')).toEqual([
            {
                fields: ["plain", "with, comma", 'quote "inside"', ""],
                line: 1,
            },
        ]);
    });

    test("normalizes line endings inside quoted multiline fields", () => {
        expect(
            parseRows(
                'first,"line 1\r\nline 2\rline 3\nline 4"\r\n\r\nsecond,value',
            ),
        ).toEqual([
            {
                fields: ["first", "line 1\nline 2\nline 3\nline 4"],
                line: 1,
            },
            { fields: ["second", "value"], line: 6 },
        ]);
    });

    test("tracks row start lines across mixed line endings and blank rows", () => {
        expect(parseRows("one\r\n\r\ntwo\rthree\nfour")).toEqual([
            { fields: ["one"], line: 1 },
            { fields: ["two"], line: 3 },
            { fields: ["three"], line: 4 },
            { fields: ["four"], line: 5 },
        ]);
    });

    test("keeps explicit empty records while ignoring physical blank lines", () => {
        expect(parseRows('\n  \r\n,\n""\n')).toEqual([
            { fields: ["", ""], line: 3 },
            { fields: [""], line: 4 },
        ]);
    });

    test("ignores a UTF-8 BOM only at the beginning of the file", () => {
        expect(
            parseRows('\uFEFF"header, one",header two\nvalue,\uFEFFvalue'),
        ).toEqual([
            { fields: ["header, one", "header two"], line: 1 },
            { fields: ["value", "\uFEFFvalue"], line: 2 },
        ]);
    });

    test("rejects an unterminated quoted field at its opening line", () => {
        expect(parseCsvRows('header\nvalue,"line one\nline two')).toEqual({
            success: false,
            error: { line: 2, message: "Unterminated quoted field" },
        });
    });
});

test.describe("splitCsvList", () => {
    test("returns no items for an empty or whitespace-only field", () => {
        expect(splitCsvList("")).toEqual([]);
        expect(splitCsvList(" \t ")).toEqual([]);
    });

    test("splits, trims, and removes empty items", () => {
        expect(splitCsvList(" first; second ; ;third;")).toEqual([
            "first",
            "second",
            "third",
        ]);
    });

    test("treats doubled semicolons as literal semicolons", () => {
        expect(splitCsvList("A;;B")).toEqual(["A;B"]);
        expect(splitCsvList("A;;; B")).toEqual(["A;", "B"]);
        expect(splitCsvList("A;;;;B")).toEqual(["A;;B"]);
        expect(splitCsvList("A;; B; C")).toEqual(["A; B", "C"]);
    });
});
