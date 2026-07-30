import { createContext, useContext } from "hono/jsx";

/** Describes preferences form state. */
export interface PreferencesFormState {
    values?: Record<string, string>;
}

/** Provides the preferences form context shared by this module. */
const PreferencesFormContext = createContext<PreferencesFormState>({});

/** Stores the preferences form provider used by this module. */
export const PreferencesFormProvider = PreferencesFormContext.Provider;

/** Returns preferences form state. */
export function usePreferencesFormState(): PreferencesFormState {
    return useContext(PreferencesFormContext);
}

/** Returns a submitted preference value or its current user fallback. */
export function preferencesFieldValue(
    state: PreferencesFormState,
    name: string,
    fallback: string,
): string {
    return state.values?.[name] ?? fallback;
}
