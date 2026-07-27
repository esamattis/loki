import { createContext, type Child, useContext } from "hono/jsx";
import type { User } from "@/core/user";

export interface CoreAppUi {
    authenticatedUserSubtitle: (user: User) => string;
    navigationLabel: string;
    navigation?: (props: { end?: Child }) => Child;
    menuItems?: Child;
    footerLinks?: Child;
    registrationFields?: Child;
    preferencesContent?: Child;
    privacyPolicyContent: Child;
}

const CoreAppContext = createContext<CoreAppUi | null>(null);

export const CoreAppProvider = CoreAppContext.Provider;

export function useCoreAppUi(): CoreAppUi {
    const value = useContext(CoreAppContext);
    if (!value) {
        throw new Error("Core app UI context not set");
    }
    return value;
}
