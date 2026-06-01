type ColorPickerInputProps = {
    label: string
    value: string
    onChange: (value: string) => void
}

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

export function ColorPickerInput({
    label,
    value,
    onChange,
}: ColorPickerInputProps) {
    const pickerValue = HEX_COLOR_PATTERN.test(value) ? value : '#000000'

    return (
        <div className="flex flex-col gap-1 text-xs font-medium text-gray-700">
            <span>{label}</span>
            <span className="flex items-center gap-2">
                <input
                    type="color"
                    aria-label={`${label} picker`}
                    value={pickerValue}
                    onChange={(event) => onChange(event.target.value)}
                    className="h-8 w-10 cursor-pointer rounded border border-gray-300 bg-white p-0.5"
                />
                <input
                    aria-label={label}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-sm font-normal text-gray-900"
                />
            </span>
        </div>
    )
}
