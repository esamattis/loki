import { ButtonLink } from "@/core/components/form";
import * as routes from "@/app/routes";

export function ExportLogbookButton(props: { className?: string }) {
    return (
        <ButtonLink
            href={routes.logbook.transfer.export({})}
            download
            variant="primary"
            className={props.className}
        >
            Export logbook
        </ButtonLink>
    );
}
