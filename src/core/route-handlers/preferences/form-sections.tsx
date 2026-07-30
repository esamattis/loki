import { useRequestContext } from "@/core/create-app";
import { Button, Checkbox, Input, Select } from "@/core/components/form";
import { Password } from "@/core/route-handlers/auth/components";
import {
    preferencesFieldValue,
    usePreferencesFormState,
} from "@/core/route-handlers/preferences/form-context";

/** Renders profile fields in the preferences form. */
export function ProfileSection() {
    const context = useRequestContext();
    const user = context.getUser();
    const state = usePreferencesFormState();
    return (
        <section className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Profile
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Update the details associated with your account.
                </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
                <Input
                    name="username"
                    label="Username"
                    required
                    value={preferencesFieldValue(
                        state,
                        "username",
                        user.username,
                    )}
                />
                <Input
                    name="displayName"
                    label="Display name"
                    value={preferencesFieldValue(
                        state,
                        "displayName",
                        user.displayName ?? "",
                    )}
                />
                <Input
                    name="email"
                    label="Email"
                    type="email"
                    required
                    value={preferencesFieldValue(state, "email", user.email)}
                />
            </div>
        </section>
    );
}

/** Renders locale and formatting fields in the preferences form. */
export function FormattingSection() {
    const user = useRequestContext().getUser();
    const state = usePreferencesFormState();
    const dateTimeFormat = preferencesFieldValue(
        state,
        "dateTimeFormat",
        user.options.dateTimeFormat,
    );
    const numberFormat = preferencesFieldValue(
        state,
        "numberFormat",
        user.options.numberFormat,
    );
    return (
        <section className="space-y-5 border-t border-slate-200 pt-8 dark:border-slate-800">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Formatting
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Choose how dates, UTC timestamps, and numbers are displayed.
                </p>
            </div>
            <Select name="dateTimeFormat" label="Date and time format">
                <option value="finnish" selected={dateTimeFormat === "finnish"}>
                    Day.month.year, 24-hour (14.7.2026 klo 16.05.30)
                </option>
                <option
                    value="european"
                    selected={dateTimeFormat === "european"}
                >
                    Day/month/year, 24-hour (14/07/2026, 16:05:30)
                </option>
                <option
                    value="american"
                    selected={dateTimeFormat === "american"}
                >
                    Month/day/year, 12-hour (07/14/2026, 4:05:30 PM)
                </option>
                <option value="iso" selected={dateTimeFormat === "iso"}>
                    Year-month-day, 24-hour (2026-07-14 16:05:30 UTC)
                </option>
            </Select>
            <Select name="numberFormat" label="Number format">
                <option
                    value="space-comma"
                    selected={numberFormat === "space-comma"}
                >
                    Space and comma (12 345,67)
                </option>
                <option
                    value="period-comma"
                    selected={numberFormat === "period-comma"}
                >
                    Period and comma (12.345,67)
                </option>
                <option
                    value="comma-period"
                    selected={numberFormat === "comma-period"}
                >
                    Comma and period (12,345.67)
                </option>
            </Select>
        </section>
    );
}

/** Renders password fields in the preferences form. */
export function PasswordSection() {
    return (
        <section className="space-y-5 border-t border-slate-200 pt-8 dark:border-slate-800">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Password
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Leave these fields empty to keep your current password.
                </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
                <Password
                    name="password"
                    label="New password"
                    placeholder="Choose a new password"
                />
                <Password
                    name="confirmPassword"
                    label="Confirm new password"
                    placeholder="Enter the new password again"
                />
            </div>
        </section>
    );
}

/** Renders performance settings in the preferences form. */
export function PerformanceSection() {
    const user = useRequestContext().getUser();
    const state = usePreferencesFormState();
    const checked =
        state.values != null
            ? state.values.htmlCacheEnabled === "true"
            : user.options.htmlCacheEnabled;
    return (
        <section className="space-y-5 border-t border-slate-200 pt-8 dark:border-slate-800">
            <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Performance
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Cache generated pages securely for faster navigation. The
                    cache is cleared whenever you submit a form.
                </p>
            </div>
            <Checkbox
                name="htmlCacheEnabled"
                value="true"
                label="Enable page caching"
                checked={checked}
            />
        </section>
    );
}

/** Renders the preferences form submit button. */
export function PreferencesSubmitButton() {
    return (
        <div className="hidden sm:block">
            <Button type="submit" variant="primary">
                Save preferences
            </Button>
        </div>
    );
}
