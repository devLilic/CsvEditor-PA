import type { BroadcastBackground } from '@/shared/preview/templateContract'
import { ImageFileSelector } from './ImageFileSelector'
import { ColorPickerInput } from './ColorPickerInput'

type BackgroundFieldsEditorProps = {
    background: BroadcastBackground
    onChange: (background: BroadcastBackground) => void
}

const OBJECT_FIT_OPTIONS: NonNullable<
    Extract<BroadcastBackground, { type: 'image' }>['objectFit']
>[] = ['contain', 'cover', 'fill']

export function BackgroundFieldsEditor({
    background,
    onChange,
}: BackgroundFieldsEditorProps) {
    return (
        <>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">
                Background type
                <select
                    value={background.type}
                    onChange={(event) => {
                        if (event.target.value === 'color') {
                            onChange({ type: 'color', value: '' })
                            return
                        }

                        onChange({ type: 'image', value: '', objectFit: 'cover' })
                    }}
                    className="rounded border border-gray-300 px-2 py-1 text-sm font-normal text-gray-900"
                >
                    <option value="color">color</option>
                    <option value="image">image</option>
                </select>
            </label>
            {background.type === 'color' ? (
                <ColorPickerInput
                    label="Color"
                    value={background.value}
                    onChange={(value) => onChange({
                            ...background,
                            value,
                        })}
                />
            ) : (
                <ImageFileSelector
                    label="Image path"
                    value={background.value}
                    onChange={(value) => onChange({
                        ...background,
                        value,
                    })}
                />
            )}
            {background.type === 'image' && (
                <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">
                    Object fit
                    <select
                        value={background.objectFit ?? 'cover'}
                        onChange={(event) => onChange({
                            ...background,
                            objectFit: event.target.value as NonNullable<
                                Extract<BroadcastBackground, { type: 'image' }>['objectFit']
                            >,
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
            )}
        </>
    )
}
