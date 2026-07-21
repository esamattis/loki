import { ErrorList } from "@/components/feedback";
import { Button } from "@/components/form";
import { Link } from "@/components/link";
import * as routes from "@/routes";

export function AuthFormShell(props: {
    title: string;
    errors: string[];
    submitLabel: string;
    alternateHref: string;
    alternateLabel: string;
    children: any;
}) {
    return (
        <div className="mx-4 mt-8 max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-900/5 sm:mx-auto sm:mt-16 sm:p-8 dark:bg-slate-900 dark:ring-slate-100/10">
            <a
                href={routes.home.route}
                className="mb-6 flex items-center justify-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
            >
                <img
                    src="/logo.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-8 w-auto"
                />
                <span>Loki – Skydiving Logbook</span>
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
