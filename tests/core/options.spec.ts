import { expect, test } from "@playwright/test";
import { isSafeHttpMethod } from "../../src/core/http-methods";
import { parseCoreUserOptions } from "../../src/core/options";

test("invalid core options preserve application-owned values", () => {
    const options = parseCoreUserOptions(
        JSON.stringify({
            dateTimeFormat: "invalid",
            readonly: "invalid",
            applicationSecret: "preserve-me",
        }),
    );

    expect(options).toMatchObject({
        dateTimeFormat: "iso",
        readonly: false,
        applicationSecret: "preserve-me",
    });
});

test("classifies every mutation-capable HTTP method as unsafe", () => {
    expect(["GET", "HEAD", "OPTIONS"].every(isSafeHttpMethod)).toBe(true);
    expect(["POST", "PUT", "PATCH", "DELETE"].some(isSafeHttpMethod)).toBe(
        false,
    );
});
