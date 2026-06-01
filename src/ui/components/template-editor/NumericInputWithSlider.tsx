type NumericInputWithSliderProps = {
    label: string
    value: number
    onChange: (value: number) => void
    min?: number
    max?: number
    step?: number
}

export function NumericInputWithSlider({
    label,
    value,
    onChange,
    min,
    max,
    step = 1,
}: NumericInputWithSliderProps) {
    const safeValue = Number.isFinite(value) ? value : 0
    const sliderMin = min ?? Math.min(0, safeValue)
    const sliderMax = Math.max(max ?? 2000, safeValue, sliderMin + step)
    const updateValue = (rawValue: string) => {
        if (!rawValue.trim()) return

        const nextValue = Number(rawValue)
        if (Number.isFinite(nextValue)) {
            onChange(nextValue)
        }
    }

    return (
        <div className="flex flex-col gap-1 text-xs font-medium text-gray-700">
            <span>{label}</span>
            <span className="flex items-center gap-2">
                <input
                    type="number"
                    aria-label={label}
                    min={sliderMin}
                    max={max}
                    step={step}
                    value={safeValue}
                    onChange={(event) => updateValue(event.target.value)}
                    className="w-[8ch] shrink-0 rounded border border-gray-300 px-2 py-1 text-sm font-normal text-gray-900"
                />
                <input
                    type="range"
                    aria-label={`${label} slider`}
                    min={min}
                    max={sliderMax}
                    step={step}
                    value={Math.min(Math.max(safeValue, sliderMin), sliderMax)}
                    onChange={(event) => updateValue(event.target.value)}
                    className="min-w-0 flex-1"
                />
            </span>
        </div>
    )
}
