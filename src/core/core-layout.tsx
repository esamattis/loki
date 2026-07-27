import type { Child } from "hono/jsx";
import { BackgroundGradients } from "@/core/components/background-gradients";
import { Footer } from "@/core/components/footer";
import {
    DisableFormOnSubmit,
    ShowProgressOnLinkClick,
} from "@/core/components/navigation-progress";
import { RestoreFormScrollPosition } from "@/core/components/restore-form-scroll-position";
import { ReturnAfterFormPost } from "@/core/components/return-after-form-post";
import { Tooltips } from "@/core/components/tooltips";
import { UnsavedChangesDialog } from "@/core/components/unsaved-changes-dialog";
import { UpdateToast } from "@/core/components/update-toast";
import {
    CoreLayoutProvider,
    type CoreLayoutUi,
} from "@/core/core-layout-context";
import { useAppContext } from "@/core/create-app";

/**
 * Props for `CoreLayout`: app-provided UI slots plus page children.
 * Extends {@link CoreLayoutUi}.
 */
export interface CoreLayoutProps extends CoreLayoutUi {
    /** Page tree rendered between global chrome and the footer. */
    children: Child;
}

/** Picks layout UI fields from props for the context provider. */
function coreLayoutUi(props: CoreLayoutProps): CoreLayoutUi {
    return {
        authenticatedUserSubtitle: props.authenticatedUserSubtitle,
        navigationLabel: props.navigationLabel,
        navigation: props.navigation,
        menuItems: props.menuItems,
        footerLinks: props.footerLinks,
        registrationFields: props.registrationFields,
        preferencesContent: props.preferencesContent,
        preferencesAfterFormatting: props.preferencesAfterFormatting,
        preferencesDangerContent: props.preferencesDangerContent,
        privacyPolicyContent: props.privacyPolicyContent,
    };
}

/**
 * Authenticated/public layout wrapper: provides layout UI context, background,
 * footer, and global client behaviors (tooltips, progress, unsaved changes,
 * return-after-post, update toast). App supplies navigation and content slots
 * via props; see {@link CoreLayoutUi}.
 */
export function CoreLayout(props: CoreLayoutProps) {
    const appContext = useAppContext();
    const user = appContext.user;

    if (props.registrationFields && !appContext.appOptions.afterUserCreated) {
        throw new Error("registrationFields requires afterUserCreated");
    }
    if (
        (props.preferencesContent || props.preferencesAfterFormatting) &&
        (!appContext.appOptions.validatePreferencesForm ||
            !appContext.appOptions.savePreferencesForm)
    ) {
        throw new Error(
            "preferences content requires validatePreferencesForm and savePreferencesForm",
        );
    }

    return (
        <CoreLayoutProvider value={coreLayoutUi(props)}>
            <BackgroundGradients />
            <ReturnAfterFormPost />
            <div className="flex-1">{props.children}</div>
            <Footer
                hasBottomNavigation={Boolean(user)}
                showPrivacyPolicy={!appContext.isSelfHosted()}
            />
            <UnsavedChangesDialog />
            <UpdateToast />
            <RestoreFormScrollPosition />
            <Tooltips />
            <DisableFormOnSubmit />
            <ShowProgressOnLinkClick />
        </CoreLayoutProvider>
    );
}
