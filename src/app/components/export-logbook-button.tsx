import { ButtonLink } from "@/components/form";
import * as routes from "@/routes";

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
