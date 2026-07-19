import { BuildInfo } from "@/components/build-info";
import { buttonClassName } from "@/components/form";
import { BurgerMenuIcon } from "@/components/icons";
import {
    AboutIcon,
    AdminIcon,
    AircraftIcon,
    GearIcon,
    InstallIcon,
    JumpTypeIcon,
    LocationIcon,
    LogoutIcon,
    PreferencesIcon,
    TransferIcon,
} from "@/components/menu-icons";
import {
    DropdownMenu,
    MenuButton,
    MenuDivider,
    MenuLink,
} from "@/components/ui/dropdown-menu";
import * as routes from "@/routes";

const menuIconClassName =
    "h-4 w-4 flex-none text-slate-400 dark:text-slate-500";

export function MainMenu(props: { isAdmin: boolean; menuClassName?: string }) {
    return (
        <DropdownMenu
            label="Menu"
            button={<BurgerMenuIcon className="h-5 w-5" />}
            buttonClassName={buttonClassName({
                variant: "secondary",
                className: "px-3 py-2",
            })}
            menuClassName={props.menuClassName}
        >
            <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <BuildInfo />
            </div>
            <MenuDivider />
            <MenuLink href={routes.logbook.aircraft.index({})}>
                <AircraftIcon className={menuIconClassName} />
                Manage aircraft
            </MenuLink>
            <MenuLink href={routes.logbook.gear.index({})}>
                <GearIcon className={menuIconClassName} />
                Manage gear
            </MenuLink>
            <MenuLink href={routes.logbook.jumpTypes.index({})}>
                <JumpTypeIcon className={menuIconClassName} />
                Manage jump types
            </MenuLink>
            <MenuLink href={routes.logbook.locations.index({})}>
                <LocationIcon className={menuIconClassName} />
                Manage locations
            </MenuLink>
            <MenuDivider />
            <MenuLink href={routes.logbook.transfer.index({})}>
                <TransferIcon className={menuIconClassName} />
                Import or export
            </MenuLink>
            <MenuDivider />
            {props.isAdmin && (
                <MenuLink href={routes.admin.index({})}>
                    <AdminIcon className={menuIconClassName} />
                    Admin
                </MenuLink>
            )}
            <MenuLink href={routes.preferences({})}>
                <PreferencesIcon className={menuIconClassName} />
                Preferences
            </MenuLink>
            <MenuLink href={routes.install({})}>
                <InstallIcon className={menuIconClassName} />
                Install app
            </MenuLink>
            <MenuLink href={routes.about({})}>
                <AboutIcon className={menuIconClassName} />
                About
            </MenuLink>
            <MenuDivider />
            <form method="post" action={routes.auth.logout({})}>
                <MenuButton type="submit">
                    <LogoutIcon className={menuIconClassName} />
                    Log out
                </MenuButton>
            </form>
        </DropdownMenu>
    );
}
