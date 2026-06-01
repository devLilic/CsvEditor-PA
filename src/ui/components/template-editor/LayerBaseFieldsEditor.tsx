import type { BroadcastLayer } from '@/shared/preview/templateContract'
import { NumericInputWithSlider } from './NumericInputWithSlider'

type LayerBaseFieldsEditorProps = {
    layer: BroadcastLayer
    onChange: (layer: BroadcastLayer) => void
}

type NumericLayerKey =
    | 'x'
    | 'y'
    | 'width'
    | 'height'
    | 'zIndex'
    | 'opacity'
    | 'rotation'

const ROTATION_ORIGINS = [
    'top left',
    'top center',
    'top right',
    'center left',
    'center center',
    'center right',
    'bottom left',
    'bottom center',
    'bottom right',
] as const

export function LayerBaseFieldsEditor({
    layer,
    onChange,
}: LayerBaseFieldsEditorProps) {
    const updateNumber = (key: NumericLayerKey, value: number) => {
        onChange({
            ...layer,
            [key]: value,
        })
    }

    return (
        <>
            <NumericInputWithSlider label="X" value={layer.x} onChange={(value) => updateNumber('x', value)} />
            <NumericInputWithSlider label="Y" value={layer.y} onChange={(value) => updateNumber('y', value)} />
            <NumericInputWithSlider
                label="Width"
                value={layer.width}
                min={0}
                onChange={(value) => updateNumber('width', value)}
            />
            <NumericInputWithSlider
                label="Height"
                value={layer.height}
                min={0}
                onChange={(value) => updateNumber('height', value)}
            />
            <NumericInputWithSlider
                label="Z index"
                value={layer.zIndex}
                onChange={(value) => updateNumber('zIndex', value)}
            />
            <NumericInputWithSlider
                label="Opacity"
                value={layer.opacity ?? 1}
                min={0}
                max={1}
                step={0.01}
                onChange={(value) => updateNumber('opacity', value)}
            />
            <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded border border-gray-200 p-2">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                    <input
                        type="checkbox"
                        checked={layer.visible !== false}
                        onChange={(event) => onChange({
                            ...layer,
                            visible: event.target.checked,
                        })}
                    />
                    Visible
                </label>
                {layer.type === 'text' && (
                    <>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                            <input
                                type="checkbox"
                                checked={layer.fitInBox !== false}
                                onChange={(event) => onChange({
                                    ...layer,
                                    fitInBox: event.target.checked,
                                })}
                            />
                            Fit in box
                        </label>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                            <input
                                type="checkbox"
                                checked={Boolean(layer.border)}
                                onChange={(event) => onChange({
                                    ...layer,
                                    border: event.target.checked
                                        ? {
                                            color: '#ff00ff',
                                            width: 1,
                                            style: 'solid',
                                        }
                                        : undefined,
                                })}
                            />
                            Border 1px
                        </label>
                    </>
                )}
            </div>
            <NumericInputWithSlider
                label="Rotation"
                value={layer.rotation ?? 0}
                min={-360}
                max={360}
                onChange={(value) => updateNumber('rotation', value)}
            />
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">
                Rotation origin
                <select
                    value={layer.rotationOrigin ?? 'center center'}
                    onChange={(event) => onChange({
                        ...layer,
                        rotationOrigin: event.target.value as NonNullable<typeof layer.rotationOrigin>,
                    })}
                    className="rounded border border-gray-300 px-2 py-1 text-sm font-normal text-gray-900"
                >
                    {ROTATION_ORIGINS.map((origin) => (
                        <option key={origin} value={origin}>
                            {origin}
                        </option>
                    ))}
                </select>
            </label>
        </>
    )
}
