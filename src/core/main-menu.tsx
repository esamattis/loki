import { BuildInfo } from "@/core/components/build-info";
import { buttonClassName } from "@/core/components/form";
import {
    AdminIcon,
    BurgerMenuIcon,
    LogoutIcon,
    PreferencesIcon,
} from "@/core/components/icons";
import {
    DropdownMenu,
    MenuButton,
    MenuDivider,
    MenuLink,
} from "@/core/components/ui/dropdown-menu";
import { useCoreLayoutUi } from "@/core/core-layout-context";
import * as routes from "@/core/routes";

const menuIconClassName =
    "h-4 w-4 flex-none text-slate-400 dark:text-slate-500";

export function MainMenu(props: { isAdmin: boolean; menuClassName?: string }) {
    const appUi = useCoreLayoutUi();
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
            {appUi.menuItems}
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
