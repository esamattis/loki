import { ErrorList } from "@/core/components/feedback";
import { Button } from "@/core/components/form";
import { Link } from "@/core/components/link";
import { useRequestContext } from "@/core/create-app";

/**
 * Centered card layout for login and registration forms: logo, title, errors,
 * POST form body, submit button, and an alternate action link.
 *
 * @param props.title - Heading above the form.
 * @param props.errors - Validation or auth error messages.
 * @param props.submitLabel - Primary submit button label.
 * @param props.alternateHref - URL for the secondary link (e.g. register/login).
 * @param props.alternateLabel - Label for the secondary link.
 * @param props.children - Form fields rendered inside the POST form.
 */
export function AuthFormShell(props: {
    title: string;
    errors: string[];
    submitLabel: string;
    alternateHref: string;
    alternateLabel: string;
    children: any;
}) {
    const options = useRequestContext().appOptions;
    return (
        <div className="mx-4 mt-8 max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-900/5 sm:mx-auto sm:mt-16 sm:p-8 dark:bg-slate-900 dark:ring-slate-100/10">
            <a
                href="/"
                className="mb-6 flex items-center justify-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
            >
                <img
                    src={options.logoPath}
                    alt=""
                    aria-hidden="true"
                    className="h-8 w-auto"
                />
                <span>{options.title}</span>
            </a>
            <h2 className="mb-6 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {props.title}
            </h2>
            <ErrorList
                errors={props.errors}
                className="mb-5 space-y-1 rounded-lg bg-red-50 p-3 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/50"
            />
            <form method="post" className="space-y-4">
                {props.children}
                <Button
                    type="submit"
                    variant="primary"
                    className="w-full px-4 py-3 text-base font-semibold sm:py-2.5"
                >
                    {props.submitLabel}
                </Button>
                <div className="pt-2 text-center text-sm text-slate-600 dark:text-slate-400">
                    <Link href={props.alternateHref}>
                        {props.alternateLabel}
                    </Link>
                </div>
            </form>
        </div>
    );
}
