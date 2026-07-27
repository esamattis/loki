import { createContext, type Child, useContext } from "hono/jsx";
import type { User } from "@/core/user";

export interface CoreLayoutUi {
    authenticatedUserSubtitle: (user: User) => string;
    navigationLabel: string;
    navigation?: (props: { end?: Child }) => Child;
    menuItems?: Child;
    footerLinks?: Child;
    registrationFields?: Child;
    preferencesContent?: Child;
    privacyPolicyContent: Child;
}

const CoreLayoutContext = createContext<CoreLayoutUi | null>(null);

export const CoreLayoutProvider = CoreLayoutContext.Provider;

export function useCoreLayoutUi(): CoreLayoutUi {
    const value = useContext(CoreLayoutContext);
    if (!value) {
        throw new Error("Core layout UI context not set");
    }
    return value;
}
