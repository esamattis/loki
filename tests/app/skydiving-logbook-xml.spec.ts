import { expect, test } from "./fixtures";
import { parseSkydivingLogbookXml } from "@/app/logbook/transfer/skydiving-logbook-xml";

test("XML import ignores empty catalog placeholders and rig collections", () => {
    const records = parseSkydivingLogbookXml(`
        <skydiving_logbook>
            <locations>
                <location><id>location-1</id><name>Test location</name></location>
            </locations>
            <aircrafts>
                <aircraft><id>aircraft-1</id><name>Test aircraft</name></aircraft>
            </aircrafts>
            <rigs>
                <rig><id>rig-1</id><name>Test rig</name></rig>
                <rig><id>placeholder</id><name /></rig>
            </rigs>
            <skydive_types>
                <skydive_type><id>type-1</id><name>Test type</name></skydive_type>
            </skydive_types>
            <log_entries>
                <log_entry>
                    <jump_number>1</jump_number>
                    <date>2026-01-02</date>
                    <exit_altitude>4000</exit_altitude>
                    <deployment_altitude>1000</deployment_altitude>
                    <freefall_time>50</freefall_time>
                    <location_id>location-1</location_id>
                    <aircraft_id>aircraft-1</aircraft_id>
                    <rigs> </rigs>
                    <skydive_type_id>type-1</skydive_type_id>
                </log_entry>
            </log_entries>
        </skydiving_logbook>
    `);

    expect(records.filter((record) => record.type === "gear")).toEqual([
        {
            type: "gear",
            name: "Test rig",
            previousCount: 0,
        },
    ]);
    expect(records.find((record) => record.type === "jump")).toMatchObject({
        jumpNumber: 1,
        gear: [],
    });
});

test("XML import errors identify malformed catalog items and log entries", () => {
    expect(() =>
        parseSkydivingLogbookXml(`
            <skydiving_logbook>
                <locations><location>invalid</location></locations>
                <aircrafts>
                    <aircraft><id>aircraft-1</id><name>Test aircraft</name></aircraft>
                </aircrafts>
                <rigs>
                    <rig><id>rig-1</id><name>Test rig</name></rig>
                </rigs>
                <skydive_types>
                    <skydive_type><id>type-1</id><name>Test type</name></skydive_type>
                </skydive_types>
                <log_entries>
                    <log_entry><jump_number>invalid</jump_number></log_entry>
                    <log_entry><jump_number>2</jump_number></log_entry>
                </log_entries>
            </skydiving_logbook>
        `),
    ).toThrow(
        [
            "Location 1: record is missing or invalid",
            "Log entry 1: jump number must be a whole number of at least 1",
            "Log entry 2 (jump #2): date is missing",
        ].join("\n"),
    );
});

test("XML syntax errors include their line and column", () => {
    expect(() =>
        parseSkydivingLogbookXml(`
            <skydiving_logbook>
                <locations>
            </skydiving_logbook>
        `),
    ).toThrow(/Invalid XML at line \d+, column \d+:/);
});
