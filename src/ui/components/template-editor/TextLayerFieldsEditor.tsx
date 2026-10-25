import type { BroadcastTextLayer } from '@/shared/preview/templateContract'
import { NumericInputWithSlider } from './NumericInputWithSlider'
import { ColorPickerInput } from './ColorPickerInput'

type TextLayerFieldsEditorProps = {
    layer: BroadcastTextLayer
    onChange: (layer: BroadcastTextLayer) => void
    supportedFieldIds?: string[]
    showColorField?: boolean
}

function StringInput({
    label,
    value,
    placeholder,
    onChange,
}: {
    label: string
    value: string
    placeholder?: string
    onChange: (value: string) => void
}) {
    return (
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">
            {label}
            <input
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
                className="rounded border border-gray-300 px-2 py-1 text-sm font-normal text-gray-900"
            />
        </label>
    )
}

function SelectInput({
    label,
    value,
    options,
    onChange,
}: {
    label: string
    value: string
    options: { label: string; value: string }[]
    onChange: (value: string) => void
}) {
    return (
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">
            {label}
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="rounded border border-gray-300 px-2 py-1 text-sm font-normal text-gray-900"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    )
}

export function TextLayerFieldsEditor({
    layer,
    onChange,
    supportedFieldIds,
    showColorField = true,
}: TextLayerFieldsEditorProps) {
    const updateLayer = (patch: Partial<BroadcastTextLayer>) => {
        onChange({
            ...layer,
            ...patch,
            type: 'text',
        })
    }

    const updateTextStyle = (
        patch: Partial<BroadcastTextLayer['textStyle']>
    ) => {
        onChange({
            ...layer,
            type: 'text',
            textStyle: {
                ...layer.textStyle,
                ...patch,
            },
        })
    }

    return (
        <>
            <StringInput
                label="Field id"
                value={layer.fieldId}
                placeholder="Optional: bind to a data field"
                onChange={(fieldId) => updateLayer({ fieldId })}
            />
            {supportedFieldIds && (
                <p className="col-span-2 text-xs font-normal text-gray-500">
                    Fields built into this graphic: {supportedFieldIds.join(', ')}. Other IDs are saved as custom fields.
                </p>
            )}
            <StringInput
                label="Entity input label"
                value={layer.inputLabel ?? ''}
                placeholder="Optional; leave empty to hide this input"
                onChange={(inputLabel) => updateLayer({ inputLabel })}
            />
            <StringInput
                label="Fallback"
                value={layer.fallbackText ?? ''}
                onChange={(fallbackText) => updateLayer({ fallbackText })}
            />
            <StringInput
                label="Default value"
                value={layer.fieldDefaultValue ?? ''}
                onChange={(fieldDefaultValue) => updateLayer({ fieldDefaultValue })}
            />
            <NumericInputWithSlider
                label="Min scale X"
                value={layer.minScaleX ?? 1}
                min={0}
                onChange={(minScaleX) => updateLayer({ minScaleX })}
            />
            <StringInput
                label="Font family"
                value={layer.textStyle.fontFamily}
                onChange={(fontFamily) => updateTextStyle({ fontFamily })}
            />
            <NumericInputWithSlider
                label="Font size"
                value={layer.textStyle.fontSize}
                min={1}
                onChange={(fontSize) => updateTextStyle({ fontSize })}
            />
            <NumericInputWithSlider
                label="Font weight"
                value={layer.textStyle.fontWeight}
                min={1}
                onChange={(fontWeight) => updateTextStyle({ fontWeight })}
            />
            {showColorField && <ColorPickerInput
                label="Color"
                value={layer.textStyle.color}
                onChange={(color) => updateTextStyle({ color })}
            />}
            <SelectInput
                label="Align"
                value={layer.textStyle.align}
                options={[
                    { label: 'left', value: 'left' },
                    { label: 'center', value: 'center' },
                    { label: 'right', value: 'right' },
                ]}
                onChange={(align) => updateTextStyle({
                    align: align as BroadcastTextLayer['textStyle']['align'],
                })}
            />
            {!layer.textParts?.length && (
                <SelectInput
                    label="Transform"
                    value={layer.textStyle.transform ?? ''}
                    options={[
                        { label: 'none', value: '' },
                        { label: 'uppercase', value: 'uppercase' },
                    ]}
                    onChange={(transform) => updateTextStyle({
                        transform: transform
                            ? transform as BroadcastTextLayer['textStyle']['transform']
                            : undefined,
                    })}
                />
            )}
            <NumericInputWithSlider
                label="Line height"
                value={layer.textStyle.lineHeight ?? 1}
                min={0}
                onChange={(lineHeight) => updateTextStyle({ lineHeight })}
            />
            <StringInput
                label="Letter spacing"
                value={layer.textStyle.letterSpacing ?? ''}
                onChange={(letterSpacing) => updateTextStyle({ letterSpacing })}
            />
        </>
    )
}
