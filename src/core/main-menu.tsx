import { BuildInfo } from "@/core/components/build-info";
import { buttonClassName } from "@/core/components/form";
import {
    DropdownMenu,
    MenuButton,
    MenuDivider,
    MenuLink,
} from "@/core/components/ui/dropdown-menu";
import { useAppContext } from "@/core/create-app";
import * as routes from "@/core/routes";

export function MainMenu(props: { isAdmin: boolean; menuClassName?: string }) {
    const appOptions = useAppContext().appOptions;
    return (
        <DropdownMenu
            label="Menu"
            button={<span aria-hidden="true">Menu</span>}
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
            {appOptions.appMenuItems?.()}
            <MenuDivider />
            {props.isAdmin && (
                <MenuLink href={routes.admin.index({})}>Admin</MenuLink>
            )}
            <MenuLink href={routes.preferences({})}>Preferences</MenuLink>
            <MenuDivider />
            <form method="post" action={routes.auth.logout({})}>
                <MenuButton type="submit">Log out</MenuButton>
            </form>
        </DropdownMenu>
    );
}
