import { createContext, useContext } from "hono/jsx";

export interface PreferencesFormState {
    values?: Record<string, string>;
}

const PreferencesFormContext = createContext<PreferencesFormState>({});

export const PreferencesFormProvider = PreferencesFormContext.Provider;

export function usePreferencesFormState(): PreferencesFormState {
    return useContext(PreferencesFormContext);
}

export function preferencesFieldValue(
    state: PreferencesFormState,
    name: string,
    fallback: string,
): string {
    return state.values?.[name] ?? fallback;
}
