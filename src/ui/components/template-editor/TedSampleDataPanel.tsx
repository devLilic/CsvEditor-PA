import {
    getDefaultTedSampleData,
    mergeTedSampleData,
} from '@/features/template-editor/domain/tedSampleData'
import type { TedEntityType } from '@/features/template-editor/domain/tedTypes'
import { ImageFileSelector } from './ImageFileSelector'

type TedSampleDataPanelProps = {
    entityType: TedEntityType
    overrides: Record<string, string>
    onOverridesChange: (overrides: Record<string, string>) => void
}

export function TedSampleDataPanel({
    entityType,
    overrides,
    onOverridesChange,
}: TedSampleDataPanelProps) {
    const sampleData = mergeTedSampleData(entityType, overrides)
    const fieldIds = Object.keys(getDefaultTedSampleData(entityType))

    return (
        <section className="rounded border bg-white p-3">
            <div className="mb-2 text-sm font-semibold text-gray-900">
                Sample data
            </div>
            <div className="grid grid-cols-1 gap-2">
                {fieldIds.map((fieldId) => fieldId === 'image' ? (
                    <ImageFileSelector
                        key={fieldId}
                        label="image"
                        value={overrides[fieldId] ?? ''}
                        onChange={(value) => onOverridesChange({
                            ...overrides,
                            [fieldId]: value,
                        })}
                    />
                ) : (
                    <label
                        key={fieldId}
                        className="flex flex-col gap-1 text-xs font-medium text-gray-700"
                    >
                        {fieldId}
                        <input
                            value={overrides[fieldId] ?? ''}
                            onChange={(event) => onOverridesChange({
                                ...overrides,
                                [fieldId]: event.target.value,
                            })}
                            className="rounded border border-gray-300 px-2 py-1 text-sm font-normal text-gray-900"
                        />
                    </label>
                ))}
            </div>
            <div className="mt-2 rounded bg-gray-50 px-2 py-1 text-xs text-gray-600">
                {Object.entries(sampleData).map(([key, value]) => (
                    <div key={key} className="truncate">
                        {key}: {value}
                    </div>
                ))}
            </div>
        </section>
    )
}
