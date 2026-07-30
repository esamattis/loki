import { createContext, type Child, useContext } from "hono/jsx";
import type { User } from "@/core/user";

/**
 * App-specific UI slots consumed by core layout, header, footer, and account
 * pages. Provided once from the composition root via `CoreLayout`.
 */
export interface CoreLayoutUi {
    /** Secondary line under the app title in the header (e.g. username). */
    authenticatedUserSubtitle: (user: User) => string;
    /** Accessible name for the primary/bottom navigation landmark. */
    navigationLabel: string;
    /**
     * Primary nav renderer. On mobile, `end` may include the account menu.
     * Omit when the app has no primary nav.
     */
    navigation?: (props: { end?: Child }) => Child;
    /** Extra items in the account dropdown above Admin/Preferences. */
    menuItems?: Child;
    /** Extra footer links between Home and Terms. */
    footerLinks?: Child;
    /** Extra fields on the registration form; requires `afterUserCreated`. */
    registrationFields?: Child;
    /** Main preferences form body; requires preferences save/validate hooks. */
    preferencesContent?: Child;
    /** Preferences section after formatting options. */
    preferencesAfterFormatting?: Child;
    /** Destructive preferences actions inside the danger zone. */
    preferencesDangerContent?: Child;
}

/** Provides the core layout context shared by this module. */
const CoreLayoutContext = createContext<CoreLayoutUi | null>(null);

/** Provider for {@link CoreLayoutUi}; used by `CoreLayout`. */
export const CoreLayoutProvider = CoreLayoutContext.Provider;

/**
 * Reads layout UI slots from context. Throws if rendered outside `CoreLayout`.
 */
export function useCoreLayoutUi(): CoreLayoutUi {
    const value = useContext(CoreLayoutContext);
    if (!value) {
        throw new Error("Core layout UI context not set");
    }
    return value;
}
