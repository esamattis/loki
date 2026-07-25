import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { getAppContext, useDateFormatter, useNumberFormatter } from "@/app/app";
import { Link } from "@/components/link";
import * as routes from "@/routes";
import { jumps } from "@/schema";

export interface RecordJump {
    uuid: string;
    jumpNumber: number;
    jumpDate: string;
    value: string;
    tooltip?: string;
}

export interface RecordPeriod {
    startDate: string;
    endDate: string;
    jumpCount: number;
}

export function RecordJumps(props: {
    records: Array<{ label: string; jump: RecordJump | undefined }>;
    periods: Array<{ label: string; period: RecordPeriod | undefined }>;
}) {
    const formatDate = useDateFormatter();
    const formatNumber = useNumberFormatter();
    return (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Record jumps
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Fastest and slowest freefall speeds are averages and only
                    include jumps with more than 2,000 m of freefall.
                </p>
            </div>
            <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                {props.records.map((record) => (
                    <div
                        key={record.label}
                        className="flex items-center justify-between gap-4 px-5 py-3.5"
                    >
                        <dt className="text-sm text-slate-600 dark:text-slate-400">
                            {record.label}
                        </dt>
                        <dd className="text-right">
                            {record.jump ? (
                                <Link
                                    href={routes.logbook.jumps.edit({
                                        uuid: record.jump.uuid,
                                    })}
                                >
                                    <span
                                        data-loki-tooltip={record.jump.tooltip}
                                    >
                                        {record.jump.value}
                                    </span>{" "}
                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                        Jump #{record.jump.jumpNumber} (
                                        {formatDate(record.jump.jumpDate)})
                                    </span>
                                </Link>
                            ) : (
                                <span className="text-sm text-slate-400 dark:text-slate-500">
                                    No recorded jump
                                </span>
                            )}
                        </dd>
                    </div>
                ))}
                {props.periods.map((record) => (
                    <div
                        key={record.label}
                        className="flex items-center justify-between gap-4 px-5 py-3.5"
                    >
                        <dt className="text-sm text-slate-600 dark:text-slate-400">
                            {record.label}
                        </dt>
                        <dd className="text-right">
                            {record.period ? (
                                <Link
                                    href={routes.logbook.index(
                                        {},
                                        {
                                            start: record.period.startDate,
                                            end: record.period.endDate,
                                        },
                                    )}
                                >
                                    {formatNumber(record.period.jumpCount)}{" "}
                                    {record.period.jumpCount === 1
                                        ? "jump"
                                        : "jumps"}{" "}
                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                        ({formatDate(record.period.startDate)}
                                        {record.period.endDate !==
                                            record.period.startDate &&
                                            ` - ${formatDate(record.period.endDate)}`}
                                        )
                                    </span>
                                </Link>
                            ) : (
                                <span className="text-sm text-slate-400 dark:text-slate-500">
                                    No recorded jump
                                </span>
                            )}
                        </dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

function fetchAverageSpeedRecord(
    db: ReturnType<typeof getAppContext>["db"],
    jumpCondition: ReturnType<typeof and>,
    fastest: boolean,
) {
    const averageSpeed = sql<number>`(${jumps.exitAltitude} - ${jumps.openingAltitude}) * 1.0 / ${jumps.freefallTime}`;
    return db
        .select({
            uuid: jumps.uuid,
            jumpNumber: jumps.jumpNumber,
            jumpDate: jumps.jumpDate,
            value: averageSpeed,
        })
        .from(jumps)
        .where(
            and(
                jumpCondition,
                gt(jumps.freefallTime, 0),
                gt(sql`${jumps.exitAltitude} - ${jumps.openingAltitude}`, 2000),
            ),
        )
        .orderBy(fastest ? desc(averageSpeed) : asc(averageSpeed))
        .limit(1);
}

export function fetchRecordStatistics(
    db: ReturnType<typeof getAppContext>["db"],
    userUuid: string,
    jumpCondition: ReturnType<typeof and>,
) {
    return Promise.all([
        db
            .select({ year: sql<string>`substr(${jumps.jumpDate}, 1, 4)` })
            .from(jumps)
            .where(eq(jumps.userUuid, userUuid))
            .groupBy(sql`substr(${jumps.jumpDate}, 1, 4)`)
            .orderBy(sql`substr(${jumps.jumpDate}, 1, 4) desc`),
        db
            .select({
                startDate: jumps.jumpDate,
                endDate: jumps.jumpDate,
                jumpCount: sql<number>`count(*)`,
            })
            .from(jumps)
            .where(jumpCondition)
            .groupBy(jumps.jumpDate)
            .orderBy(desc(sql`count(*)`), desc(jumps.jumpDate))
            .limit(1),
        db
            .select({
                startDate: sql<string>`date(${jumps.jumpDate}, '-' || ((cast(strftime('%w', ${jumps.jumpDate}) as integer) + 6) % 7) || ' days')`,
                endDate: sql<string>`date(${jumps.jumpDate}, '-' || ((cast(strftime('%w', ${jumps.jumpDate}) as integer) + 6) % 7) || ' days', '+6 days')`,
                jumpCount: sql<number>`count(*)`,
            })
            .from(jumps)
            .where(jumpCondition)
            .groupBy(
                sql`date(${jumps.jumpDate}, '-' || ((cast(strftime('%w', ${jumps.jumpDate}) as integer) + 6) % 7) || ' days')`,
            )
            .orderBy(
                desc(sql`count(*)`),
                desc(
                    sql`date(${jumps.jumpDate}, '-' || ((cast(strftime('%w', ${jumps.jumpDate}) as integer) + 6) % 7) || ' days')`,
                ),
            )
            .limit(1),
        db
            .select({
                startDate: sql<string>`date(${jumps.jumpDate}, 'start of month')`,
                endDate: sql<string>`date(${jumps.jumpDate}, 'start of month', '+1 month', '-1 day')`,
                jumpCount: sql<number>`count(*)`,
            })
            .from(jumps)
            .where(jumpCondition)
            .groupBy(sql`strftime('%Y-%m', ${jumps.jumpDate})`)
            .orderBy(
                desc(sql`count(*)`),
                desc(sql`strftime('%Y-%m', ${jumps.jumpDate})`),
            )
            .limit(1),
        db
            .select({
                uuid: jumps.uuid,
                jumpNumber: jumps.jumpNumber,
                jumpDate: jumps.jumpDate,
                value: jumps.freefallTime,
            })
            .from(jumps)
            .where(jumpCondition)
            .orderBy(desc(jumps.freefallTime))
            .limit(1),
        db
            .select({
                uuid: jumps.uuid,
                jumpNumber: jumps.jumpNumber,
                jumpDate: jumps.jumpDate,
                value: sql<number>`max(${jumps.exitAltitude} - ${jumps.openingAltitude}, 0)`,
            })
            .from(jumps)
            .where(jumpCondition)
            .orderBy(
                desc(
                    sql`max(${jumps.exitAltitude} - ${jumps.openingAltitude}, 0)`,
                ),
            )
            .limit(1),
        db
            .select({
                uuid: jumps.uuid,
                jumpNumber: jumps.jumpNumber,
                jumpDate: jumps.jumpDate,
                value: jumps.exitAltitude,
            })
            .from(jumps)
            .where(jumpCondition)
            .orderBy(desc(jumps.exitAltitude))
            .limit(1),
        db
            .select({
                uuid: jumps.uuid,
                jumpNumber: jumps.jumpNumber,
                jumpDate: jumps.jumpDate,
                value: jumps.exitAltitude,
            })
            .from(jumps)
            .where(jumpCondition)
            .orderBy(asc(jumps.exitAltitude))
            .limit(1),
        db
            .select({
                uuid: jumps.uuid,
                jumpNumber: jumps.jumpNumber,
                jumpDate: jumps.jumpDate,
                value: jumps.openingAltitude,
            })
            .from(jumps)
            .where(jumpCondition)
            .orderBy(desc(jumps.openingAltitude))
            .limit(1),
        db
            .select({
                uuid: jumps.uuid,
                jumpNumber: jumps.jumpNumber,
                jumpDate: jumps.jumpDate,
                value: jumps.openingAltitude,
            })
            .from(jumps)
            .where(jumpCondition)
            .orderBy(asc(jumps.openingAltitude))
            .limit(1),
        fetchAverageSpeedRecord(db, jumpCondition, true),
        fetchAverageSpeedRecord(db, jumpCondition, false),
        db
            .select({
                totalFreefallTime: sql<number>`coalesce(sum(${jumps.freefallTime}), 0)`,
                totalFreefallDistance: sql<number>`coalesce(sum(max(${jumps.exitAltitude} - ${jumps.openingAltitude}, 0)), 0)`,
            })
            .from(jumps)
            .where(jumpCondition),
    ]);
}
