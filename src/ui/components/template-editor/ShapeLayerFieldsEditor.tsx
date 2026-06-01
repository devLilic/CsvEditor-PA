import type { BroadcastShapeLayer } from '@/shared/preview/templateContract'
import { NumericInputWithSlider } from './NumericInputWithSlider'
import { ColorPickerInput } from './ColorPickerInput'

type ShapeLayerFieldsEditorProps = {
    layer: BroadcastShapeLayer
    onChange: (layer: BroadcastShapeLayer) => void
}

export function ShapeLayerFieldsEditor({
    layer,
    onChange,
}: ShapeLayerFieldsEditorProps) {
    return (
        <>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">
                Shape type
                <select
                    value={layer.shapeType}
                    disabled
                    className="rounded border border-gray-300 bg-gray-100 px-2 py-1 text-sm font-normal text-gray-900"
                >
                    <option value="rect">rect</option>
                </select>
            </label>
            <ColorPickerInput
                label="Fill"
                value={layer.fill.value}
                onChange={(value) => onChange({
                        ...layer,
                        type: 'shape',
                        shapeType: 'rect',
                        fill: {
                            ...layer.fill,
                            value,
                        },
                    })}
            />
            <NumericInputWithSlider
                label="Border radius"
                value={layer.borderRadius ?? 0}
                min={0}
                onChange={(borderRadius) => onChange({
                    ...layer,
                    type: 'shape',
                    shapeType: 'rect',
                    borderRadius,
                })}
            />
        </>
    )
}
