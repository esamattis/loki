import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { getAppContext, type App, type AppRequestContext } from "@/app/app";
import { ButtonLink } from "@/components/form";
import { ConfirmDangerButton } from "@/components/ui/confirm-danger-button";
import * as routes from "@/routes";
import { jumps } from "@/schema";

export function MissingJumpCard(props: {
    jumpNumbers: number[];
    lowerJumpNumber: number;
    upperJumpNumber: number;
}) {
    const gapCount = props.jumpNumbers.length;
    return (
        <li className="col-span-full rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/50 px-5 py-4 dark:border-indigo-800 dark:bg-indigo-950/20">
            <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Missing {gapCount === 1 ? "jump" : "jumps"}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Add {gapCount === 1 ? "this jump" : "these jumps"} to fill
                    the missing {gapCount === 1 ? "number" : "numbers"} in your
                    logbook.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {props.jumpNumbers.map((jumpNumber) => (
                        <ButtonLink
                            href={routes.logbook.jumps.new(
                                {},
                                { jumpNumber: String(jumpNumber) },
                            )}
                            size="sm"
                            key={jumpNumber}
                        >
                            Add jump #{jumpNumber}
                        </ButtonLink>
                    ))}
                </div>
            </div>
            <hr className="my-4 border-indigo-200 dark:border-indigo-900" />
            <form action={routes.logbook.jumps.removeGaps({})} method="post">
                <input
                    type="hidden"
                    name="lowerJumpNumber"
                    value={String(props.lowerJumpNumber)}
                />
                <input
                    type="hidden"
                    name="upperJumpNumber"
                    value={String(props.upperJumpNumber)}
                />
                <ConfirmDangerButton
                    label="Remove gaps"
                    confirmLabel="Confirm remove gaps"
                />
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Renumbers jump #{props.upperJumpNumber} and every jump after
                    it down by {gapCount}. No jump records will be deleted.
                </p>
            </form>
        </li>
    );
}

function parsePositiveInteger(value: FormDataEntryValue | null) {
    if (typeof value !== "string" || !/^\d+$/.test(value)) {
        return undefined;
    }
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

export async function handleRemoveJumpGaps(c: AppRequestContext) {
    const formData = await c.req.formData();
    const lowerJumpNumber = parsePositiveInteger(
        formData.get("lowerJumpNumber"),
    );
    const upperJumpNumber = parsePositiveInteger(
        formData.get("upperJumpNumber"),
    );
    if (
        lowerJumpNumber === undefined ||
        upperJumpNumber === undefined ||
        upperJumpNumber <= lowerJumpNumber + 1
    ) {
        return c.text("Invalid jump number gap.", 400);
    }

    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const boundaryRows = await db
        .select({ jumpNumber: jumps.jumpNumber })
        .from(jumps)
        .where(
            and(
                eq(jumps.userUuid, userUuid),
                gte(jumps.jumpNumber, lowerJumpNumber),
                lte(jumps.jumpNumber, upperJumpNumber),
            ),
        )
        .orderBy(asc(jumps.jumpNumber));
    if (
        boundaryRows.length !== 2 ||
        boundaryRows[0]?.jumpNumber !== lowerJumpNumber ||
        boundaryRows[1]?.jumpNumber !== upperJumpNumber
    ) {
        return c.text("Jump number gap no longer exists.", 400);
    }

    const gapCount = upperJumpNumber - lowerJumpNumber - 1;
    await db.batch([
        db
            .update(jumps)
            .set({ jumpNumber: sql`-${jumps.jumpNumber}` })
            .where(
                and(
                    eq(jumps.userUuid, userUuid),
                    gte(jumps.jumpNumber, upperJumpNumber),
                ),
            ),
        db
            .update(jumps)
            .set({ jumpNumber: sql`-${jumps.jumpNumber} - ${gapCount}` })
            .where(
                and(
                    eq(jumps.userUuid, userUuid),
                    lte(jumps.jumpNumber, -upperJumpNumber),
                ),
            ),
    ]);
    return c.redirect(routes.logbook.index({}));
}

export function register(app: App) {
    app.post(routes.logbook.jumps.removeGaps.route, handleRemoveJumpGaps);
}
