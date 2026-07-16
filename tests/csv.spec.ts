import { expect, test } from "@playwright/test";
import { parseCsvRows, splitCsvList } from "@/utils/csv";

test.describe("parseCsvRows", () => {
    test("returns no rows for empty and whitespace-only content", () => {
        expect(parseCsvRows("")).toEqual([]);
        expect(parseCsvRows(" \t\r\n\r\n  \n")).toEqual([]);
    });

    test("preserves empty fields, whitespace, and a trailing field", () => {
        expect(parseCsvRows("first, two ,,\n")).toEqual([
            { fields: ["first", " two ", "", ""], line: 1 },
        ]);
        expect(parseCsvRows(",")).toEqual([{ fields: ["", ""], line: 1 }]);
    });

    test("parses quoted commas and doubled quotes", () => {
        expect(
            parseCsvRows('plain,"with, comma","quote ""inside""",""'),
        ).toEqual([
            {
                fields: ["plain", "with, comma", 'quote "inside"', ""],
                line: 1,
            },
        ]);
    });

    test("normalizes line endings inside quoted multiline fields", () => {
        expect(
            parseCsvRows(
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
        expect(parseCsvRows("one\r\n\r\ntwo\rthree\nfour")).toEqual([
            { fields: ["one"], line: 1 },
            { fields: ["two"], line: 3 },
            { fields: ["three"], line: 4 },
            { fields: ["four"], line: 5 },
        ]);
    });

    test("keeps explicit empty records while ignoring physical blank lines", () => {
        expect(parseCsvRows('\n  \r\n,\n""\n')).toEqual([
            { fields: ["", ""], line: 3 },
            { fields: [""], line: 4 },
        ]);
    });

    test("ignores a UTF-8 BOM only at the beginning of the file", () => {
        expect(
            parseCsvRows('\uFEFF"header, one",header two\nvalue,\uFEFFvalue'),
        ).toEqual([
            { fields: ["header, one", "header two"], line: 1 },
            { fields: ["value", "\uFEFFvalue"], line: 2 },
        ]);
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
