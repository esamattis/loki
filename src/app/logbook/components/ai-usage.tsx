import type { LanguageModelUsage } from "ai";
import { desc, eq, sql } from "drizzle-orm";
import {
    getAppContext,
    useDateFormatter,
    useNumberFormatter,
    type AppRequestContext,
} from "@/app/app";
import { JUMP_IMAGE_MODELS } from "@/options";
import { aiUsage } from "@/schema";

export type AiUsageRow = {
    uuid: string;
    model: string;
    title: string;
    createdAt: number;
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
};

export type AiUsageTotals = {
    reads: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
};

function TokenCount(props: { value: number | null | undefined }) {
    const formatNumber = useNumberFormatter();
    return <>{props.value == null ? "—" : formatNumber(props.value)}</>;
}

function UsageTitle(props: { title: string }) {
    const formatDate = useDateFormatter();
    const title = props.title
        .split(" · ")
        .map((part) =>
            /^\d{4}-\d{2}-\d{2}$/.test(part) ? formatDate(part) : part,
        )
        .join(" · ");
    return <>{title}</>;
}

function ModelLabel(props: { model: string }) {
    for (const entry of JUMP_IMAGE_MODELS) {
        if (entry.id === props.model) {
            return <>{entry.label}</>;
        }
    }
    return <>{props.model}</>;
}

function UsageCard(props: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {props.label}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                <TokenCount value={props.value} />
            </p>
        </div>
    );
}

export function AiUsageSummary(props: {
    totals: AiUsageTotals;
    rows: AiUsageRow[];
}) {
    const formatDate = useDateFormatter();
    return (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    AI usage
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Token usage from jump image reads for your account.
                </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <UsageCard label="Reads" value={props.totals.reads} />
                <UsageCard
                    label="Input tokens"
                    value={props.totals.inputTokens}
                />
                <UsageCard
                    label="Output tokens"
                    value={props.totals.outputTokens}
                />
                <UsageCard
                    label="Total tokens"
                    value={props.totals.totalTokens}
                />
            </div>
            {props.rows.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    No image reads yet.
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
                        <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                            <tr>
                                <th
                                    scope="col"
                                    className="whitespace-nowrap px-4 py-3"
                                >
                                    Date
                                </th>
                                <th
                                    scope="col"
                                    className="w-full min-w-64 px-4 py-3"
                                >
                                    Title
                                </th>
                                <th
                                    scope="col"
                                    className="whitespace-nowrap px-4 py-3"
                                >
                                    Model
                                </th>
                                <th
                                    scope="col"
                                    className="whitespace-nowrap px-4 py-3 text-right"
                                >
                                    Input
                                </th>
                                <th
                                    scope="col"
                                    className="whitespace-nowrap px-4 py-3 text-right"
                                >
                                    Output
                                </th>
                                <th
                                    scope="col"
                                    className="whitespace-nowrap px-4 py-3 text-right"
                                >
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {props.rows.map((row) => (
                                <tr key={row.uuid}>
                                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400">
                                        <time
                                            dateTime={new Date(
                                                row.createdAt * 1000,
                                            ).toISOString()}
                                        >
                                            {formatDate(row.createdAt)}
                                        </time>
                                    </td>
                                    <td className="w-full min-w-64 px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                                        <UsageTitle title={row.title} />
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                                        <ModelLabel model={row.model} />
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                                        <TokenCount value={row.inputTokens} />
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                                        <TokenCount value={row.outputTokens} />
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                                        <TokenCount value={row.totalTokens} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

export async function getAiUsageForUser(c: AppRequestContext): Promise<{
    totals: AiUsageTotals;
    rows: AiUsageRow[];
}> {
    const db = getAppContext(c).db;
    const userUuid = getAppContext(c).getUser().uuid;
    const [totalsRow, rows] = await Promise.all([
        db
            .select({
                reads: sql<number>`count(*)`,
                inputTokens: sql<number>`coalesce(sum(${aiUsage.inputTokens}), 0)`,
                outputTokens: sql<number>`coalesce(sum(${aiUsage.outputTokens}), 0)`,
                totalTokens: sql<number>`coalesce(sum(${aiUsage.totalTokens}), 0)`,
            })
            .from(aiUsage)
            .where(eq(aiUsage.userUuid, userUuid))
            .get(),
        db
            .select({
                uuid: aiUsage.uuid,
                model: aiUsage.model,
                title: aiUsage.title,
                createdAt: aiUsage.createdAt,
                inputTokens: aiUsage.inputTokens,
                outputTokens: aiUsage.outputTokens,
                totalTokens: aiUsage.totalTokens,
            })
            .from(aiUsage)
            .where(eq(aiUsage.userUuid, userUuid))
            .orderBy(desc(aiUsage.createdAt)),
    ]);

    return {
        totals: {
            reads: totalsRow?.reads ?? 0,
            inputTokens: totalsRow?.inputTokens ?? 0,
            outputTokens: totalsRow?.outputTokens ?? 0,
            totalTokens: totalsRow?.totalTokens ?? 0,
        },
        rows,
    };
}

export function buildAiUsageTitle(data: {
    jumpNumber: number | null;
    jumpDate: string | null;
    location: string | null;
    jumpType: string[] | null;
}): string {
    const parts: string[] = [];
    if (data.jumpNumber != null) {
        parts.push(`#${data.jumpNumber}`);
    }
    if (data.jumpDate?.trim()) {
        parts.push(data.jumpDate.trim());
    }
    if (data.location?.trim()) {
        parts.push(data.location.trim());
    }
    const jumpTypes = data.jumpType
        ?.map((item) => item.trim())
        .filter(Boolean)
        .join(", ");
    if (jumpTypes) {
        parts.push(jumpTypes);
    }
    if (parts.length === 0) {
        return "Jump image read";
    }
    return parts.join(" · ");
}

export async function recordAiUsage(options: {
    c: AppRequestContext;
    model: string;
    title: string;
    usage: LanguageModelUsage;
}) {
    const db = getAppContext(options.c).db;
    const userUuid = getAppContext(options.c).getUser().uuid;
    await db.insert(aiUsage).values({
        userUuid,
        model: options.model,
        title: options.title,
        createdAt: Math.floor(Date.now() / 1000),
        inputTokens: options.usage.inputTokens ?? null,
        outputTokens: options.usage.outputTokens ?? null,
        totalTokens: options.usage.totalTokens ?? null,
    });
}
