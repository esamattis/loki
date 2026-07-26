import { eq } from "drizzle-orm";
import { createApp, useAppContext, type AppContext } from "@/core/create-app";
import { registerCoreRoutes } from "@/core/register-routes";
import { registerAppRoutes } from "@/app/register-routes";
import * as lokiRoutes from "@/app/routes";
import { LogbookActions } from "@/app/navigation-actions";
import { MenuLink } from "@/core/components/ui/dropdown-menu";
import { Link } from "@/core/components/link";
import { createDefaultJumpItems } from "@/app/default-jump-items";
import { aiUsage } from "@/app/schema";
import { LokiUserOptionsSchema } from "@/app/options";
import { users } from "@/core/schema";
import { LokiRegistrationFields } from "@/app/registration-fields";
import { LokiPreferences } from "@/app/preferences";
import { LokiPrivacyPolicyContent } from "@/app/privacy-policy-content";
import {
    authenticatedUserSubtitle,
    buildName,
    navigationLabel,
    repositoryUrl,
} from "@/app/identity";

function LokiNavigation() {
    return <LogbookActions pathname={useAppContext().url().pathname} />;
}

function LokiMenuItems() {
    const user = useAppContext().getUser();
    return (
        <>
            <MenuLink href={lokiRoutes.logbook.aircraft.index({})}>
                Manage aircraft
            </MenuLink>
            <MenuLink href={lokiRoutes.logbook.gear.index({})}>
                Manage gear
            </MenuLink>
            <MenuLink href={lokiRoutes.logbook.jumpTypes.index({})}>
                Manage jump types
            </MenuLink>
            <MenuLink href={lokiRoutes.logbook.locations.index({})}>
                Manage locations
            </MenuLink>
            <MenuLink href={lokiRoutes.logbook.transfer.index({})}>
                Import or export
            </MenuLink>
            <MenuLink href={lokiRoutes.install({})}>Install app</MenuLink>
            <MenuLink href={lokiRoutes.about({})}>About</MenuLink>
            {user.admin && (
                <MenuLink href={lokiRoutes.lokiAdmin({})}>
                    Recorded jumps
                </MenuLink>
            )}
        </>
    );
}

function LokiFooterLinks() {
    return <Link href={lokiRoutes.about({})}>About</Link>;
}

async function initializeLokiUser(
    context: AppContext,
    userUuid: string,
    values: Readonly<Record<string, string>>,
): Promise<void> {
    const options = LokiUserOptionsSchema.pick({
        altitudeUnits: true,
        speedUnits: true,
    }).parse(values);
    const row = await context.db
        .select({ options: users.options })
        .from(users)
        .where(eq(users.uuid, userUuid))
        .get();
    if (!row) throw new Error("New user not found during Loki initialization");
    const current = LokiUserOptionsSchema.parse(JSON.parse(row.options));
    await context.db
        .update(users)
        .set({ options: JSON.stringify({ ...current, ...options }) })
        .where(eq(users.uuid, userUuid));
    await createDefaultJumpItems(context.db, userUuid);
}

async function scrubAiUsageBeforeAccountDeletion(
    context: AppContext,
    userUuid: string,
): Promise<void> {
    await context.db
        .update(aiUsage)
        .set({ title: "Deleted account" })
        .where(eq(aiUsage.userUuid, userUuid));
}

// Concrete composition root: core never imports app; app imports and configures core.
export const app = createApp({
    name: "Loki",
    title: "Loki - Skydiving Logbook",
    repositoryUrl,
    buildName,
    description:
        "Open source digital skydiving logbook. Self-host, run locally, or use the invite-only hosted version. Your jumps, your gear, your data.",
    basicAuthRealm: "Loki - Skydiving Logbook",
    authenticatedHome: lokiRoutes.logbook.index({}),
    logoPath: "/logo.svg",
    themeColor: "#4f46e5",
    socialImagePath: "/og-image.png",
    socialImageAlt: "Loki - Open source skydiving logbook",
    authenticatedUserSubtitle,
    navigationLabel,
    navigation: LokiNavigation,
    appMenuItems: LokiMenuItems,
    footerLinks: LokiFooterLinks,
    privacyPolicyContent: LokiPrivacyPolicyContent,
    registrationFields: LokiRegistrationFields,
    preferencesContent: LokiPreferences,
    afterUserCreated: initializeLokiUser,
    beforeUserDeleted: scrubAiUsageBeforeAccountDeletion,
});

registerCoreRoutes(app);
registerAppRoutes(app);
