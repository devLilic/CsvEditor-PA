import type { BroadcastImageLayer } from '@/shared/preview/templateContract'
import { hasFixedTemplateImageSource } from '@/features/template-editor/domain/fixedTemplateFields'
import { ImageFileSelector } from './ImageFileSelector'

type ImageLayerFieldsEditorProps = {
    layer: BroadcastImageLayer
    onChange: (layer: BroadcastImageLayer) => void
}

const OBJECT_FIT_OPTIONS: NonNullable<BroadcastImageLayer['objectFit']>[] = [
    'contain',
    'cover',
    'fill',
]

export function ImageLayerFieldsEditor({
    layer,
    onChange,
}: ImageLayerFieldsEditorProps) {
    const hasFixedSource = hasFixedTemplateImageSource(layer)

    return (
        <>
            {hasFixedSource
                ? (
                    <div className="flex flex-col gap-1 text-xs font-medium text-gray-700">
                        Source
                        <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-sm font-normal text-gray-600">
                            {layer.src} (fix)
                        </span>
                    </div>
                )
                : (
                    <ImageFileSelector
                        label="Source"
                        value={layer.src}
                        onChange={(src) => onChange({
                        ...layer,
                        type: 'image',
                        src,
                        })}
                    />
                )}
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">
                Object fit
                <select
                    value={layer.objectFit ?? 'contain'}
                    onChange={(event) => onChange({
                        ...layer,
                        type: 'image',
                        objectFit: event.target.value as NonNullable<BroadcastImageLayer['objectFit']>,
                    })}
                    className="rounded border border-gray-300 px-2 py-1 text-sm font-normal text-gray-900"
                >
                    {OBJECT_FIT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            </label>
        </>
    )
}
