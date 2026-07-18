import { z } from "zod";
import { getAppContext, type AppRequestContext, type User } from "@/app/app";
import { FormActions, Input, NumberInput } from "@/components/form";
import { ErrorList } from "@/components/feedback";
import { RedirectBackAfterPost } from "@/components/return-after-form-post";
import * as routes from "@/routes";

export function requireAdmin(c: AppRequestContext): User | null {
    const user = getAppContext(c).getUser();
    if (!user.admin) {
        return null;
    }
    return user;
}

export const InvitationSchema = z.object({
    code: z
        .string()
        .trim()
        .min(1, "Code is required")
        .max(100, "Code is too long"),
    count: z.coerce
        .number()
        .int("Count must be an integer")
        .min(0, "Count must be 0 or greater"),
});

interface InvitationFormValues {
    code?: string;
    count?: string;
}

export function InvitationForm(props: {
    values?: InvitationFormValues;
    errors?: string[];
    submitLabel: string;
    codeReadOnly?: boolean;
}) {
    const values = props.values ?? {};
    return (
        <form
            method="post"
            data-loki-confirm={
                props.codeReadOnly ? "Edit Invitation" : "Add Invitation"
            }
            className="max-w-xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
            <RedirectBackAfterPost />
            <ErrorList
                errors={props.errors ?? []}
                className="border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
            />
            {props.codeReadOnly ? (
                <div>
                    <p className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Invitation code
                    </p>
                    <p className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                        {values.code}
                    </p>
                    <input type="hidden" name="code" value={values.code} />
                </div>
            ) : (
                <Input
                    name="code"
                    label="Invitation code"
                    required
                    autofocus
                    value={values.code}
                />
            )}
            <NumberInput
                name="count"
                label="Remaining uses"
                min="0"
                required
                value={values.count ?? "0"}
            />
            <FormActions
                submitLabel={props.submitLabel}
                cancelHref={routes.admin.index({})}
            />
        </form>
    );
}

export function getInvitationFormValues(
    formData: FormData,
): InvitationFormValues {
    function getValue(name: string): string {
        const value = formData.get(name);
        return typeof value === "string" ? value : "";
    }
    return {
        code: getValue("code"),
        count: getValue("count"),
    };
}
