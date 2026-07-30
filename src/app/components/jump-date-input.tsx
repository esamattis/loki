import { DateInput } from "@/core/components/date-input";

export function JumpDateInput(props: {
    label: string;
    name: string;
    value: string;
    required?: boolean;
    showToday?: boolean;
}) {
    return (
        <DateInput
            label={props.label}
            name={props.name}
            value={props.value}
            required={props.required}
            showToday={props.showToday}
            inputDataAttributes={{ "data-loki-jump-date-input": "" }}
            pickerDataAttributes={{ "data-loki-jump-date-picker": "" }}
        />
    );
}
