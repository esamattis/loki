import { eq } from "drizzle-orm";
import {
    createApp,
    useAppContext,
    type AppContext,
    type AppRenderProps,
} from "@/core/create-app";
import { AppShell } from "@/core/app-shell";
import { CoreLayout } from "@/core/core-layout";
import { registerCoreRoutes } from "@/core/register-routes";
import { registerAppRoutes } from "@/app/register-routes";
import * as lokiRoutes from "@/app/routes";
import { LogbookActions } from "@/app/navigation-actions";
import { MenuDivider, MenuLink } from "@/core/components/ui/dropdown-menu";
import { Link } from "@/core/components/link";
import { createDefaultJumpItems } from "@/app/default-jump-items";
import { aiUsage } from "@/app/schema";
import { LokiUserOptionsSchema } from "@/app/options";
import { users } from "@/core/schema";
import { LokiRegistrationFields } from "@/app/registration-fields";
import { LokiPreferencesContent } from "@/app/preferences";
import { LokiPrivacyPolicyContent } from "@/app/privacy-policy-content";
import {
    authenticatedUserSubtitle,
    navigationLabel,
    repositoryUrl,
} from "@/app/identity";
import {
    AboutIcon,
    AircraftIcon,
    GearIcon,
    InstallIcon,
    JumpTypeIcon,
    LocationIcon,
    StatisticsIcon,
    TransferIcon,
} from "@/app/components/menu-icons";
import type { Child } from "hono/jsx";

const menuIconClassName =
    "h-4 w-4 flex-none text-slate-400 dark:text-slate-500";

function LokiNavigation(props: { end?: Child }) {
    return (
        <LogbookActions
            pathname={useAppContext().url().pathname}
            end={props.end}
        />
    );
}

function LokiMenuItems() {
    const user = useAppContext().getUser();
    return (
        <>
            <MenuLink href={lokiRoutes.logbook.aircraft.index({})}>
                <AircraftIcon className={menuIconClassName} />
                Manage aircraft
            </MenuLink>
            <MenuLink href={lokiRoutes.logbook.gear.index({})}>
                <GearIcon className={menuIconClassName} />
                Manage gear
            </MenuLink>
            <MenuLink href={lokiRoutes.logbook.jumpTypes.index({})}>
                <JumpTypeIcon className={menuIconClassName} />
                Manage jump types
            </MenuLink>
            <MenuLink href={lokiRoutes.logbook.locations.index({})}>
                <LocationIcon className={menuIconClassName} />
                Manage locations
            </MenuLink>
            <MenuDivider />
            <MenuLink href={lokiRoutes.logbook.transfer.index({})}>
                <TransferIcon className={menuIconClassName} />
                Import or export
            </MenuLink>
            <MenuDivider />
            <MenuLink href={lokiRoutes.install({})}>
                <InstallIcon className={menuIconClassName} />
                Install app
            </MenuLink>
            <MenuLink href={lokiRoutes.about({})}>
                <AboutIcon className={menuIconClassName} />
                About
            </MenuLink>
            {user.admin && (
                <MenuLink href={lokiRoutes.lokiAdmin({})}>
                    <StatisticsIcon className={menuIconClassName} />
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

function renderApp(props: AppRenderProps) {
    return (
        <AppShell>
            <CoreLayout
                authenticatedUserSubtitle={authenticatedUserSubtitle}
                navigationLabel={navigationLabel}
                navigation={LokiNavigation}
                menuItems={<LokiMenuItems />}
                footerLinks={<LokiFooterLinks />}
                registrationFields={<LokiRegistrationFields />}
                preferencesContent={<LokiPreferencesContent />}
                privacyPolicyContent={<LokiPrivacyPolicyContent />}
            >
                {props.children}
            </CoreLayout>
        </AppShell>
    );
}

// Concrete composition root: core never imports app; app imports and configures core.
export const app = createApp({
    name: "Loki",
    title: "Loki - Skydiving Logbook",
    repositoryUrl,
    description:
        "Open source digital skydiving logbook. Self-host, run locally, or use the invite-only hosted version. Your jumps, your gear, your data.",
    basicAuthRealm: "Loki - Skydiving Logbook",
    authenticatedHome: lokiRoutes.logbook.index({}),
    logoPath: "/logo.svg",
    themeColor: "#4f46e5",
    socialImagePath: "/og-image.png",
    socialImageAlt: "Loki - Open source skydiving logbook",
    render: renderApp,
    afterUserCreated: initializeLokiUser,
    beforeUserDeleted: scrubAiUsageBeforeAccountDeletion,
});

registerCoreRoutes(app);
registerAppRoutes(app);
